/*
 File: frontend/news/serve.mjs
 Description: سرور پیش‌نمایش و توسعه برای نمونهٔ سایت news — بازبینی JSON، پایش فایل و ری‌لود زنده
 Parent Dependencies: frontend/news/{*.html,app.js,styles.css,content/*.json,assets/}
*/
import { createServer } from "node:http";
import { readFile, stat, readdir } from "node:fs/promises";
import { watch } from "node:fs";
import { extname, join, normalize, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)));
const PORT = Number(process.env.PORT || 4321);
const HOST = process.env.HOST || "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

/* ---------- بازبینی محتوا پیش از نمایش ----------
   هدف: خطای یک فایل JSON، جای خطای سفید مرورگر را نگیرد. */
async function validateContent() {
  const dir = join(ROOT, "content");
  let files = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return { ok: false, errors: ["پوشهٔ content پیدا نشد"], keys: [] };
  }
  const errors = [];
  const merged = {};
  for (const f of files) {
    try {
      const parsed = JSON.parse(await readFile(join(dir, f), "utf8"));
      Object.assign(merged, parsed);
    } catch (err) {
      errors.push(`${f}: ${err.message}`);
    }
  }
  const checks = [
    ["site.nav", Array.isArray(merged.site?.nav) && merged.site.nav.length > 0],
    ["site.phone / site.email", Boolean(merged.site?.phone && merged.site?.email)],
    ["images.reception.src", Boolean(merged.images?.reception?.src)],
    ["stats (۴ مورد)", Array.isArray(merged.stats) && merged.stats.length === 4],
    ["features", Array.isArray(merged.features) && merged.features.length >= 3],
    ["news", Array.isArray(merged.news) && merged.news.length > 0],
    ["voices", Array.isArray(merged.voices) && merged.voices.length > 0],
    ["faq.general", Array.isArray(merged.faq?.general) && merged.faq.general.length > 0],
  ];
  checks.forEach(([name, ok]) => {
    if (!ok) errors.push(`کلید «${name}» ناقص است`);
  });
  return { ok: errors.length === 0, errors, keys: Object.keys(merged), files };
}

/* ---------- ری‌لود زنده با SSE ---------- */
const clients = new Set();
let reloadTimer = null;

function broadcast(reason) {
  clearTimeout(reloadTimer);
  // چند رویداد پشت‌سرهم (ذخیرهٔ ادیتور) را در یک ریلود جمع می‌کنیم
  reloadTimer = setTimeout(() => {
    for (const res of clients) res.write(`data: ${reason}\n\n`);
  }, 120);
}

function startWatching() {
  ["content", "assets"].forEach((dir) => {
    try {
      watch(join(ROOT, dir), { recursive: true }, (_event, file) => {
        if (!file) return;
        if (file.endsWith(".json")) {
          validateContent().then((v) => {
            if (!v.ok) console.warn(`[news] ✗ محتوا نامعتبر:\n  - ${v.errors.join("\n  - ")}`);
            else console.log(`[news] ✓ content/${file} تغییر کرد — بازبینی سالم`);
          });
        }
        broadcast(file);
      });
    } catch {
      /* پایش فایل اجباری نیست؛ سرور بدون آن هم کار می‌کند */
    }
  });
}

/* اسکریپت کوچک ری‌لود: فقط در حالت dev تزریق می‌شود */
const LIVE_RELOAD = `<script>
(function(){
  if (!/[?&]dev=1/.test(location.search) && !sessionStorage.getItem('news-dev')) return;
  sessionStorage.setItem('news-dev','1');
  var es = new EventSource('/__dev/events');
  es.onmessage = function(){ location.reload(); };
  es.onerror = function(){ /* سرور قطع شد؛ تلاش بعدی خودکار است */ };
})();
</script>`;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");

    if (url.pathname === "/__dev/events") {
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      });
      res.write(": connected\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }

    if (url.pathname === "/__dev/check") {
      const v = await validateContent();
      res.writeHead(v.ok ? 200 : 500, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(v, null, 2));
      return;
    }

    // مسیر امن: از ریشهٔ پوشه بیرون نزن و دایرکتوری را لیست نکن
    const safePath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    let filePath = join(ROOT, safePath);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    let info = await stat(filePath).catch(() => null);
    if (info?.isDirectory()) {
      filePath = join(filePath, "index.html");
      info = await stat(filePath).catch(() => null);
    }
    if (!info) {
      res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
      res.end('<meta charset="utf-8"><p style="font-family:Tahoma;text-align:center;margin-top:60px">صفحه پیدا نشد — <a href="/">خانه</a></p>');
      return;
    }
    let body = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    if (ext === ".html") {
      body = Buffer.from(body.toString("utf8").replace("</body>", `${LIVE_RELOAD}</body>`), "utf8");
    }
    res.writeHead(200, {
      "content-type": MIME[ext] || "application/octet-stream",
      "cache-control": "no-store",
      // پیش‌نمایش داخل iframe میزبانی می‌شود؛ هدرهای محدودکننده حذف شده‌اند
      "x-content-type-options": "nosniff",
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500).end(String(err));
  }
});

server.listen(PORT, HOST, async () => {
  const v = await validateContent();
  console.log(`news preview → http://${HOST}:${PORT}`);
  console.log(`محتوا: ${v.files.length} فایل — ${v.ok ? "سالم ✓" : "خطا ✗"}`);
  if (!v.ok) v.errors.forEach((e) => console.log("  - " + e));
  startWatching();
});
