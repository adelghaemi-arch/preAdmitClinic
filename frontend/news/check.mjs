/*
 File: frontend/news/check.mjs
 Description: بازبینی محتوای سایت news بدون نیاز به مرورگر — برای پیش از کامیت
 Parent Dependencies: frontend/news/content/*.json, frontend/news/app.js
 Usage: node check.mjs
*/
import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)));
const errors = [];
const warnings = [];
const read = (p) => readFile(join(ROOT, p), "utf8");

/* ---------- ۱) JSON سالم و کلیدهای حیاتی ---------- */
const dir = join(ROOT, "content");
const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith(".json")).sort();
if (!files.length) errors.push("پوشهٔ content خالی یا ناموجود است");

const D = {};
for (const f of files) {
  try {
    Object.assign(D, JSON.parse(await read(`content/${f}`)));
  } catch (err) {
    errors.push(`content/${f}: JSON نامعتبر — ${err.message.split("\n")[0]}`);
  }
}

const required = [
  ["site.nav", Array.isArray(D.site?.nav) && D.site.nav.length >= 5, "منوی اصلی حداقل ۵ آیتم لازم دارد"],
  ["site.phone", Boolean(D.site?.phone && D.site?.phoneHref), "تلفن و لینک tel لازم است"],
  ["site.email", Boolean(D.site?.email), "ایمیل تماس لازم است"],
  ["images", Boolean(D.images?.reception?.src && D.images?.doctor?.src && D.images?.patient?.src), "سه تصویر پایه لازم است"],
  ["stats", Array.isArray(D.stats) && D.stats.length === 4, "نوار آماری دقیقاً ۴ عدد می‌خواهد"],
  ["features", Array.isArray(D.features) && D.features.length >= 6, "شش ویژگی صفحهٔ اصلی"],
  ["integrity", Array.isArray(D.integrity) && D.integrity.length === 6, "شش شاهد اعتماد"],
  ["journey", Array.isArray(D.journey) && D.journey.length === 4, "مسیر چهارمرحله‌ای"],
  ["hospitalPains", Array.isArray(D.hospitalPains) && D.hospitalPains.length > 0, ""],
  ["integrationModels", Array.isArray(D.integrationModels) && D.integrationModels.length === 3, "سه مدل استقرار"],
  ["roles", Array.isArray(D.roles) && D.roles.length > 0, ""],
  ["onboarding", Array.isArray(D.onboarding) && D.onboarding.length === 4, "چهار هفتهٔ استقرار"],
  ["pricing", Array.isArray(D.pricing) && D.pricing.length === 3, "سه پلن"],
  ["partnerModels", Array.isArray(D.partnerModels) && D.partnerModels.length === 3, "سه مدل مشارکت"],
  ["wallRules", Array.isArray(D.wallRules) && D.wallRules.length >= 3, "قواعد دیوار شیشه‌ای"],
  ["news", Array.isArray(D.news) && D.news.length > 0, ""],
  ["voices", Array.isArray(D.voices) && D.voices.length > 0, ""],
  ["faq.general", Array.isArray(D.faq?.general) && D.faq.general.length > 0, ""],
  ["faq.hospital", Array.isArray(D.faq?.hospital) && D.faq.hospital.length > 0, ""],
  ["faq.patient", Array.isArray(D.faq?.patient) && D.faq.patient.length > 0, ""],
  ["faq.partner", Array.isArray(D.faq?.partner) && D.faq.partner.length > 0, ""],
  ["principles", Array.isArray(D.principles) && D.principles.length === 4, "چهار اصل"],
  ["roadmap", Array.isArray(D.roadmap) && D.roadmap.length > 0, ""],
  ["team", Array.isArray(D.team) && D.team.length > 0, ""],
  ["contactTopics", Array.isArray(D.contactTopics) && D.contactTopics.length > 0, ""],
];
for (const [key, ok, msg] of required) {
  if (!ok) errors.push(`کلید «${key}» ناقص است${msg ? ` — ${msg}` : ""}`);
}

/* ---------- ۲) یکتایی شناسه‌ها و سلامت ارجاع‌ها ---------- */
const ids = (D.news || []).map((n) => n.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) errors.push(`شناسهٔ خبر تکراری: ${[...new Set(dupes)].join(", ")}`);

(D.news || []).forEach((n, i) => {
  ["id", "title", "category", "date", "excerpt", "body", "read"].forEach((k) => {
    if (!n[k]) errors.push(`news[${i}] (${n.id || "بدون id"}): فیلد «${k}» خالی است`);
  });
  if (n.image && D.images && !D.images[n.image]) errors.push(`news[${i}]: تصویر «${n.image}» در images نیست`);
});
if ((D.news || []).filter((n) => n.featured).length > 1) {
  warnings.push("بیش از یک خبر featured دارید؛ فقط اولی به‌عنوان تیتر یک رندر می‌شود");
}

/* ---------- ۳) فایل‌های ارجاع‌شده (تصاویر) ---------- */
const assets = new Set(Object.values(D.images || {}).map((v) => v.src));
for (const src of assets) {
  if (!src) continue;
  const ok = await stat(join(ROOT, src)).then((s) => s.isFile()).catch(() => false);
  if (!ok) errors.push(`تصویر موجود نیست: ${src}`);
}

/* ---------- ۴) پوستهٔ صفحه‌ها ---------- */
const htmls = (await readdir(ROOT)).filter((f) => f.endsWith(".html"));
for (const f of htmls) {
  const html = await read(f);
  if (!/dir="rtl"/.test(html)) errors.push(`${f}: dir="rtl" ندارد`);
  if (!/lang="fa"/.test(html)) errors.push(`${f}: lang="fa" ندارد`);
  if (!/app\.js/.test(html)) errors.push(`${f}: app.js لود نشده`);
  if (!/styles\.css/.test(html)) errors.push(`${f}: styles.css لود نشده`);
}

const app = await read("app.js");
const slugs = [...app.matchAll(/\n  (\w+): page[A-Z]\w*,/g)].map((m) => m[1]);
for (const slug of slugs) {
  if (!htmls.includes(`${slug}.html`)) errors.push(`صفحهٔ «${slug}» در app.js هست ولی ${slug}.html نیست`);
}
for (const f of htmls) {
  const slug = f.replace(/\.html$/, "");
  if (!slugs.includes(slug)) warnings.push(`${f} در نقشهٔ رندر app.js نیست (فقط پوسته است)`);
}

/* ---------- ۵) رشته‌های مشکوک ---------- */
const strings = JSON.stringify(D);
if (/undefined|NaN|\[object Object\]/.test(strings)) errors.push("مقدار undefined/NaN/[object Object] در محتوا پیدا شد");
if (!/[\u06F0-\u06F9]/.test(strings)) warnings.push("در محتوا رقم فارسی دیده نمی‌شود؛ بررسی کنید اعداد فارسی باشند");
if (/TODO|FIXME|XXX/.test(strings)) warnings.push("نشانهٔ TODO/FIXME در محتوا مانده است");

/* ---------- گزارش ---------- */
console.log(`\nnews check — ${files.length} فایل محتوا، ${htmls.length} صفحه، ${assets.size} تصویر\n`);
if (warnings.length) {
  console.log("هشدارها:");
  warnings.forEach((w) => console.log("  ! " + w));
  console.log("");
}
if (errors.length) {
  console.log("خطاها:");
  errors.forEach((e) => console.log("  ✗ " + e));
  console.log(`\nنتیجه: ${errors.length} خطا\n`);
  process.exit(1);
}
console.log("نتیجه: سالم ✓\n");
