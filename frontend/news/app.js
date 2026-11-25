/* ==========================================================================
   تپش — نمونهٔ وب‌سایت خبری و معرفی (پروتوتایپ طراحی)
   app.js — رندر صفحه‌ها، آیکون‌ها، تعامل‌های سبک
   محتوا از content.json خوانده می‌شود؛ فارسی و اعداد فارسی.
   ========================================================================== */

/* بلوک «ساختار پروندهٔ پیش‌پذیرش» — از ماژول جدا تا تکرارشدنی باشد */

/* محتوا به فایل‌های موضوعی تقسیم شده تا هر تغییر، سطح اثر کوچکی داشته باشد.
   ترتیب مهم نیست؛ کلیدها در loadContent ادغام می‌شوند. */
const DATA_PATHS = [
  "content/site.json",
  "content/home.json",
  "content/hospitals.json",
  "content/partners.json",
  "content/news.json",
  "content/voices.json",
  "content/faq.json",
  "content/about.json",
  "content/contact.json",
  "content/process.json",
];
/* حالت توسعه: با ?dev=1 (یا serve.mjs) تغییر فایل‌های محتوا بدون رفرش دستی اعمال می‌شود */
const DEV = new URLSearchParams(location.search).has("dev");
const DEV_WATCH_MS = 1200;
const SVG_NS = "http://www.w3.org/2000/svg";

/* ---------- آیکون‌ها (stroke، ۲۴×۲۴) ---------- */
const ICONS = {
  pulse: '<path d="M2 12h4l2.5-7 4 14 3-9 2.5 2H22"/>',
  arrow: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
  arrowUp: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  chevron: '<path d="m15 18-6-6 6-6"/>',
  phone: '<path d="M15.5 21A16.5 16.5 0 0 1 3 8.5 3.5 3.5 0 0 1 6.5 5h1a1.5 1.5 0 0 1 1.5 1.3l.4 2.3a1.5 1.5 0 0 1-.7 1.6l-1.2.7a12 12 0 0 0 5.1 5.1l.7-1.2a1.5 1.5 0 0 1 1.6-.7l2.3.4A1.5 1.5 0 0 1 19 16v1a3.5 3.5 0 0 1-3.5 3.5Z"/>',
  mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 7 9 6 9-6"/>',
  pin: '<path d="M20 10.5c0 5.5-8 11.5-8 11.5s-8-6-8-11.5a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10.2" r="2.6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.8 2.8L16 9.5"/>',
  shield: '<path d="M12 3l7.5 3v6c0 4.5-3 8.2-7.5 9.5C7.5 20.2 4.5 16.5 4.5 12V6L12 3Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  form: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h4"/>',
  doc: '<path d="M13.5 3.5H7A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V9.5l-6-6Z"/><path d="M13 3.8V10h6"/>',
  plug: '<path d="M9 3v5"/><path d="M15 3v5"/><path d="M6 8h12v3a6 6 0 0 1-12 0V8Z"/><path d="M12 17v4"/>',
  chart: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16v-4"/><path d="M12.5 16V8"/><path d="M17 16v-6"/>',
  camera: '<path d="M4 8h3l1.5-2.5h7L17 8h3a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 4 8Z"/><circle cx="12" cy="13.5" r="3.2"/>',
  chat: '<path d="M20.5 12a8 8 0 0 1-11.7 7.1L4 20.5l1.4-4.3A8 8 0 1 1 20.5 12Z"/>',
  id: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><circle cx="8.5" cy="11.5" r="2.2"/><path d="M5 16.2c.7-1.5 2-2.3 3.5-2.3s2.8.8 3.5 2.3"/><path d="M15 10h4"/><path d="M15 13.7h4"/>',
  handshake: '<path d="M3 10.5 7 7l4 2.5 2-1 2 1L19 7l2 2"/><path d="m6 13 3 3a2 2 0 0 0 2.8 0L14 14l2 2a2 2 0 0 0 2.8-2.8L15 9.5"/><path d="M3 10.5 6 14"/>',
  growth: '<path d="M4 19 9.5 12l4 3.5L20 8"/><path d="M15 8h5v5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
  building: '<rect x="4" y="4" width="9" height="16.5" rx="1.5"/><path d="M13 9.5h6.5V20.5"/><path d="M7 8h3"/><path d="M7 12h3"/><path d="M7 16h3"/><path d="M16 13h1"/><path d="M16 17h1"/>',
  heart: '<path d="M12 20s-7.5-4.4-7.5-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3.5C19.5 15.6 12 20 12 20Z"/>',
  spark: '<path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="m6 6 2.5 2.5"/><path d="m15.5 15.5 2.5 2.5"/><path d="m18 6-2.5 2.5"/><path d="m8.5 15.5-2.5 2.5"/>',
  file: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h7L18 8.5v9A2.5 2.5 0 0 1 15.5 20h-9A2.5 2.5 0 0 1 4 17.5v-11Z"/><path d="M13 4v5h5"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6"/><path d="M17.5 14.9c1.7.6 2.8 2.1 3 4.1"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M3.5 10h17"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5.5 3.5-5.5 3.5v-7Z"/>',
  stethoscope: '<path d="M6 3.5v5a4 4 0 0 0 8 0v-5"/><path d="M4 3.5h4"/><path d="M12 3.5h4"/><path d="M10 12.5v3a4.5 4.5 0 0 0 9 0v-2"/><circle cx="19" cy="11" r="2"/>',
  activity: '<path d="M3 12h3.5l2-5.5 3.5 11 2.5-7 1.8 3h4.7"/>',
  quote: '<path d="M9.5 6.5C6.5 8 5 10.3 5 13.2c0 2.3 1.3 3.8 3.2 3.8 1.8 0 3-1.2 3-2.8 0-1.6-1.1-2.7-2.6-2.7-.3 0-.6 0-.8.1.3-1.3 1.2-2.4 2.5-3.2l-.8-1.9Zm8 0C14.5 8 13 10.3 13 13.2c0 2.3 1.3 3.8 3.2 3.8 1.8 0 3-1.2 3-2.8 0-1.6-1.1-2.7-2.6-2.7-.3 0-.6 0-.8.1.3-1.3 1.2-2.4 2.5-3.2l-.8-1.9Z"/>',
};

function icon(name, cls = "") {
  const body = ICONS[name] || ICONS.pulse;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

/* ---------- کمک‌کننده‌ها ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
/* چهار بخش مهم برای نوار پایین موبایل؛ بقیه در منوی همبرگری می‌مانند */
const MOBILE_TABS = [
  { slug: "index", label: "خانه", short: "خانه", icon: "pulse" },
  { slug: "hospitals", label: "بیمارستان و کلینیک", short: "مراکز", icon: "building" },
  { slug: "patients", label: "برای بیماران", short: "بیماران", icon: "heart" },
  { slug: "contact", label: "تماس و دمو", short: "تماس", icon: "chat" },
];
/* تصاویر به‌صورت نگاشت سراسری تا رندرکارت خبر به D وابسته نباشد */
let IMG = {};
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const faNum = (n) => Number(n).toLocaleString("fa-IR");
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* مسیر صفحه از نام فایل؛ ریشه روی index.html */
function currentPage() {
  const file = location.pathname.split("/").pop() || "index.html";
  return file.replace(/\.html$/, "") || "index";
}
function hrefFor(slug) {
  return slug === "index" ? "index.html" : `${slug}.html`;
}

/* ==========================================================================
   اسکلت مشترک: هدر بالایی، ناوبری، فوتر
   ========================================================================== */
function brandBlock(B) {
  return `<a class="brand" href="index.html" aria-label="${esc(B.brandFa)} — ${esc(B.descriptor)}">
    <span class="brand__mark"><img src="assets/img/tapesh-character.png" alt="" width="40" height="40" loading="eager" decoding="async"></span>
    <span class="brand__text">
      <span class="brand__name">${esc(B.brandFa)}</span>
      <span class="brand__sub">${esc(B.brandLatin.toUpperCase())} · HEALTH INTAKE</span>
    </span>
  </a>`;
}

function headerBlock(S, page) {
  const top = `
  <div class="topbar">
    <div class="wrap topbar__in">
      <div class="topbar__meta">
        <span><span class="dot" style="display:inline-block;color:#8fcfb4;margin-inline-end:6px"></span>ویترین رسمی تپش — پیش‌پذیرش سلامت برای مراکز درمانی</span>
        <span class="sep hide-sm"></span>
        <a class="hide-sm" href="news.html">اتاق خبر</a>
      </div>
      <div class="topbar__meta">
        <a href="contact.html">درخواست دمو</a>
        <span class="sep"></span>
        <a href="tel:${esc(S.phoneHref)}" dir="ltr">${esc(S.phone)}</a>
      </div>
    </div>
  </div>`;

  const links = S.nav
    .map(
      (n) => `<a href="${hrefFor(n.slug)}"${n.slug === page ? ' aria-current="page"' : ""}>${esc(n.label)}</a>`
    )
    .join("");

  const nav = `
  <header class="nav" id="siteNav">
    <div class="wrap nav__in">
      ${brandBlock(S)}
      <nav class="nav__links" id="navLinks" aria-label="ناوبری اصلی">
        ${links}
      </nav>
      <div class="nav__actions">
        <a class="nav__phone" href="tel:${esc(S.phoneHref)}">${icon("phone")}<span dir="ltr">${esc(S.phone)}</span></a>
        <a class="btn btn--primary" href="contact.html">درخواست دمو ${icon("arrow")}</a>
        <button class="nav__toggle" id="navToggle" aria-expanded="false" aria-controls="navLinks" aria-label="منو">
          <span></span>
        </button>
      </div>
    </div>
    <div class="progress" id="readProgress" aria-hidden="true"></div>
  </header>`;

  return top + nav;
}

/* نوار پایین موبایل: بخش‌های مهم همیشه در دسترس، دمو در هدر.
   (دمو این‌جا نیست عمداً — در هدر و در همان نوار پایین بالای صفحه تکرار نمی‌شود) */
function mobileNav(S, page) {
  const items = MOBILE_TABS.map(
    (t) => `<a class="mtab${t.slug === page ? " is-on" : ""}" href="${hrefFor(t.slug)}"
        ${t.slug === page ? 'aria-current="page"' : ""}>
        <span class="mtab__ic">${icon(t.icon)}</span>
        <span class="mtab__t">${esc(t.short)}</span>
      </a>`
  ).join("");
  return `
  <nav class="mnav" aria-label="ناوبری موبایل">
    <div class="mnav__in">
      ${items}
    </div>
  </nav>`;
}

function footerBlock(S) {
  return `
  <footer class="footer">
    <div class="wrap">
      <div class="footer__grid">
        <div>
          ${brandBlock(S)}
          <p class="footer__about">تپش، لایهٔ پیش‌پذیرش سلامت است: اطلاعات، مدارک و شواهد حضور را پیش از روز مراجعه جمع می‌کند تا پذیرش کوتاه‌تر و ویزیت دقیق‌تر شود.</p>
        </div>
        <div>
          <h4>محصول</h4>
          <ul>
            <li><a href="hospitals.html">برای بیمارستان و کلینیک</a></li>
            <li><a href="patients.html">برای بیماران</a></li>
            <li><a href="partners.html">مشارکت و شرکا</a></li>
            <li><a href="hospitals.html#pricing">مدل همکاری</a></li>
          </ul>
        </div>
        <div>
          <h4>تپش</h4>
          <ul>
            <li><a href="news.html">اتاق خبر</a></li>
            <li><a href="voices.html">روایت‌ها</a></li>
            <li><a href="about.html">دربارهٔ ما</a></li>
            <li><a href="contact.html">تماس</a></li>
          </ul>
        </div>
        <div>
          <h4>خبرنامهٔ ماهانه</h4>
          <p style="font-size:.83rem;line-height:1.9">یک ایمیل در ماه: تغییرات محصول، گزارش‌های بازار و درس‌های استقرار.</p>
          <form class="newsletter" data-form="newsletter" novalidate>
            <input type="email" name="email" placeholder="ایمیل شما" aria-label="ایمیل" required>
            <button type="submit">عضویت</button>
          </form>
          <p class="footer__note" data-ok="newsletter">بدون تبلیغ، لغو اشتراک با یک کلیک.</p>
          <ul style="margin-block-start:14px">
            <li><a href="tel:${esc(S.phoneHref)}" dir="ltr">${esc(S.phone)}</a></li>
            <li><a href="mailto:${esc(S.email)}" dir="ltr">${esc(S.email)}</a></li>
            <li>${esc(S.address)}</li>
          </ul>
        </div>
      </div>
      <div class="footer__bottom">
        <span>© ۱۴۰۵ تپش — همهٔ حقوق محفوظ است.</span>
        <span class="sample-note">${icon("spark")} این یک نمونهٔ طراحی است؛ اعداد، نظرات و برخی مطالب خبری نمونه‌اند.</span>
        <span>${esc(S.hours)}</span>
      </div>
    </div>
  </footer>`;
}

/* ==========================================================================
   قطعه‌های تکرارشدنی
   ========================================================================== */
function secHead({ eyebrow, title, lead, action }) {
  return `<div class="sec__head reveal">
    <div>
      ${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ""}
      <h2 class="sec__title">${title}</h2>
      ${lead ? `<p class="sec__lead">${lead}</p>` : ""}
    </div>
    ${action || ""}
  </div>`;
}

function featureCard(f, i) {
  const box = i % 3 === 1 ? "icobox--pulse" : i % 3 === 2 ? "icobox--sand" : "";
  return `<article class="fcard reveal" data-d="${(i % 3) + 1}">
    <div class="icobox ${box}">${icon(f.icon)}</div>
    <h3>${esc(f.title)}</h3>
    <p>${esc(f.body)}</p>
    <span class="fcard__aud">${esc(f.audience)}</span>
  </article>`;
}

function ctaBlock(S, { title, lead, primary, secondary }) {
  return `<section class="section section--tight"><div class="wrap">
    <div class="cta reveal">
      <div class="cta__grid">
        <div>
          <h2>${title}</h2>
          <p>${lead}</p>
          <div class="cta__actions">
            <a class="btn btn--light" href="contact.html">${primary || "درخواست دمو"} ${icon("arrow")}</a>
            <a class="btn btn--ghost" style="border-color:rgba(255,255,255,.3);color:#fff;background:rgba(255,255,255,.06)" href="${secondary?.href || "hospitals.html#pricing"}">${secondary?.label || "دیدن مدل همکاری"}</a>
          </div>
        </div>
        <ul class="cta__list">
          <li>${icon("checkCircle")} ${esc(S.demoNote)}</li>
          <li>${icon("checkCircle")} پایلوت ۳۰ روزه بدون هزینهٔ راه‌اندازی</li>
          <li>${icon("checkCircle")} داده در مرکز خودتان می‌ماند؛ خروجی کامل قابل دریافت است</li>
        </ul>
      </div>
    </div>
  </div></section>`;
}

function trustline() {
  return `<div class="trustline reveal">
    <b>طراحی‌شده برای محیط بالینی:</b>
    <div class="trustline__items">
      <span>${icon("lock")} دسترسی حداقلی بر اساس نقش</span>
      <span>${icon("file")} لاگ ممیزی کامل</span>
      <span>${icon("plug")} سازگار با HIS موجود</span>
      <span>${icon("shield")} انتخاب و اطلاع بیمار</span>
    </div>
  </div>`;
}

/* ==========================================================================
   صفحهٔ اصلی
   ========================================================================== */
function pageIndex(D) {
  const S = D.site;
  const rc = D.images.reception;

  return `
  <section class="hero hero--warm">
    <div class="hero__grain" aria-hidden="true"></div>
    <div class="wrap hero__grid">
      <div class="hero__copy">
        <span class="hero__kicker reveal">${icon("pulse")} پیش‌پذیرش سلامت · برای بیمارستان و کلینیک</span>
        <h1 class="reveal" data-d="1">پذیرش، <em>پیش از رسیدن</em> بیمار تمام می‌شود.</h1>
        <p class="hero__lead reveal" data-d="2" id="heroLead">بیمار فرم را در خانه پر می‌کند، مدارکش را می‌فرستد و روز مراجعه فقط کارت شناسایی نشان می‌دهد. پزشک هم پروندهٔ خوانا را پیش از ورود او می‌بیند.</p>
        <div class="reveal" data-d="2" style="margin-block-start:22px">
          <div class="audience" role="group" aria-label="انتخاب مخاطب">
            <button type="button" data-aud="hospital" aria-pressed="true">بیمارستان و کلینیک</button>
            <button type="button" data-aud="patient" aria-pressed="false">بیمار و سلامت‌جو</button>
            <button type="button" data-aud="partner" aria-pressed="false">شریک و سرمایه‌گذار</button>
          </div>
        </div>
        <div class="hero__actions reveal" data-d="3">
          <a class="btn btn--primary" href="contact.html" id="heroCta">${icon("calendar")} <span>رزرو دموی ۱۵ دقیقه‌ای</span></a>
          <a class="btn btn--ghost" href="#process" id="heroSecond">${icon("pulse")} <span>مسیر پرونده را ببینید</span></a>
        </div>
        <p class="hero__note reveal" data-d="4">${icon("shield")} ${esc(S.demoNote)}</p>
      </div>

      <div class="hero__visual reveal" data-d="2">
        <figure class="hero__shot">
          <img src="${esc(rc.src)}" alt="${esc(rc.alt)}" fetchpriority="high" decoding="async">
          <figcaption>${esc(rc.credit)} · کانتر پذیرش، با پرونده‌ای که از قبل آماده است</figcaption>
        </figure>
        <div class="hero__badge">
          <i>${icon("clock")}</i>
          <span><b>${esc(D.stats[0]?.value)} ${esc(D.stats[0]?.unit)}</b><small>${esc(D.stats[0]?.label)} — ${esc(D.stats[0]?.note)}</small></span>
        </div>
      </div>
    </div>
  </section>

  <div class="statband">
    <div class="wrap statband__grid">
      ${D.stats
        .map(
          (s, i) => `<div class="stat reveal" data-d="${i + 1}">
        <div class="stat__val">${esc(s.value)} <em>${esc(s.unit)}</em></div>
        <div class="stat__label">${esc(s.label)}</div>
        <div class="stat__note">${esc(s.note)}</div>
      </div>`
        )
        .join("")}
    </div>
  </div>

  ${processSection(D)}

  <section class="section" id="what">
    <div class="wrap">
      ${secHead({
        eyebrow: "تپش چه می‌کند",
        title: "یک لایهٔ ورودی، میان بیمار و پروندهٔ بالینی.",
        lead: "تپش جای HIS را نمی‌گیرد؛ کاری را که HIS برایش ساخته نشده انجام می‌دهد: جمع‌آوری منظم اطلاعات و شواهد، پیش از حضور.",
        action: `<a class="link-arrow" href="hospitals.html">جزئیات برای مراکز درمانی ${icon("arrow")}</a>`,
      })}
      <div class="cards">
        ${D.features.map(featureCard).join("")}
      </div>
    </div>
  </section>

  <section class="section section--paper" id="journey">
    <div class="wrap">
      ${secHead({
        eyebrow: "مسیر چهار مرحله‌ای",
        title: "از دعوت تا پذیرش، چهار قدم روشن.",
        lead: "هر مرحله یک مسئول دارد و یک وضعیت قابل اندازه‌گیری. هیچ‌چیز در ابهام نمی‌ماند.",
      })}
      <div class="journey">
        ${D.journey
          .map(
            (j, i) => `<div class="jstep reveal" data-d="${i + 1}">
          <div class="jstep__num">${esc(j.num)}</div>
          <h3>${esc(j.title)}</h3>
          <p>${esc(j.body)}</p>
          <span class="jstep__who">${esc(j.who)}</span>
        </div>`
          )
          .join("")}
      </div>
      <div style="margin-block-start:26px">${trustline()}</div>
    </div>
  </section>

  <section class="section" id="integrity">
    <div class="wrap">
      ${secHead({
        eyebrow: "اعتماد، نه شعار",
        title: "چرا پروندهٔ تپش را می‌شود باور کرد.",
        lead: "پیش‌پذیرش بدون احراز حضور، فقط یک فرم آنلاین است. تپش از سه شاهد مستقل استفاده می‌کند و همه را به بیمار توضیح می‌دهد.",
        action: `<a class="link-arrow" href="patients.html#privacy">برای بیماران، شفاف ${icon("arrow")}</a>`,
      })}
      <div class="cards">
        ${D.integrity
          .map(
            (it, i) => `<article class="fcard reveal" data-d="${(i % 3) + 1}">
          <div class="icobox ${i % 2 ? "icobox--sand" : ""}">${icon(it.icon)}</div>
          <h3>${esc(it.title)}</h3>
          <p>${esc(it.body)}</p>
        </article>`
          )
          .join("")}
      </div>
    </div>
  </section>

  <section class="section section--tight" id="news-preview">
    <div class="wrap">
      ${secHead({
        eyebrow: "اتاق خبر",
        title: "آخرین خبرها و درس‌های استقرار.",
        lead: "شفاف می‌نویسیم چه چیزی منتشر شد، چه چیزی جواب داد و کجا گیر کردیم.",
        action: `<a class="link-arrow" href="news.html">همهٔ اخبار ${icon("arrow")}</a>`,
      })}
      <div class="newsgrid">
        ${D.news
          .slice(0, 3)
          .map((n, i) => newsCard(n, false, i))
          .join("")}
      </div>
    </div>
  </section>

  ${leadStrip(D.lead)}

  ${ctaBlock(S, {
    title: "یک درمانگاه، یک فرم، سی روز.<br>بعد تصمیم بگیرید.",
    lead: "پایلوت تپش را با یک فرم واقعی و پنجاه دعوت شروع می‌کنیم؛ در پایان ماه عدد دارید، نه وعده.",
    secondary: { label: "دیدن مدل همکاری", href: "partners.html" },
  })}
`;
}

/* ==========================================================================
   مدیر پروژه — یک نوار کوتاه در صفحهٔ اصلی، کارت کامل در «دربارهٔ ما»
   ========================================================================== */
function leadStrip(L) {
  if (!L) return "";
  return `<section class="section section--tight" id="lead">
    <div class="wrap">
      <a class="leadstrip reveal" href="about.html">
        <span class="leadstrip__ava">${esc(L.initials || "م‌ف")}</span>
        <span class="leadstrip__txt">
          <span class="leadstrip__k">${esc(L.role)}</span>
          <b>${esc(L.name)}</b>
          <span class="leadstrip__why">${esc(L.strip || L.why)}</span>
        </span>
        <span class="leadstrip__go">دربارهٔ ایشان و تیم ${icon("arrow")}</span>
      </a>
    </div>
  </section>`;
}

/* ==========================================================================
   کارت خبر
   ========================================================================== */
function newsCard(n, featured = false, i = 0) {
  if (featured) {
    return `<article class="ncard ncard--featured reveal" data-news>
      <div class="ncard__body">
        <div class="ncard__top">
          <span class="ncard__cat">${esc(n.category)} · تیتر یک</span>
          <span class="ncard__date">${esc(n.date)}</span>
        </div>
        <h3><a href="article.html?id=${encodeURIComponent(n.id)}">${esc(n.title)}</a></h3>
        <p>${esc(n.excerpt)}</p>
        <div class="ncard__foot">
          <span>${icon("clock")} ${esc(n.read)} مطالعه</span>
          <a class="link-arrow" href="article.html?id=${encodeURIComponent(n.id)}">خواندن خبر ${icon("arrow")}</a>
        </div>
      </div>
      <div class="ncard__side media media--side">
        <img src="${esc((IMG[n.image] || IMG.reception).src)}" alt="${esc((IMG[n.image] || IMG.reception).alt)}" loading="lazy" decoding="async">
        <span class="media__scrim"></span>
        <span class="chip" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.24);color:#eaf6ee;align-self:flex-start;position:relative;z-index:1">داخل پرونده</span>
        <p class="side-quote" style="margin-block-start:auto">«فرم کوتاه‌تر، محترمانه‌تر است.»</p>
        <span class="media__label" style="position:relative;inset:auto;z-index:1">${esc((IMG[n.image] || IMG.reception).credit)}</span>
      </div>
    </article>`;
  }
  return `<article class="ncard reveal" data-news data-d="${(i % 3) + 1}">
    <div class="ncard__top">
      <span class="ncard__cat">${esc(n.category)}</span>
      <span class="ncard__date">${esc(n.date)}</span>
    </div>
    <h3><a href="article.html?id=${encodeURIComponent(n.id)}">${esc(n.title)}</a></h3>
    <p>${esc(n.excerpt)}</p>
    <div class="ncard__foot">
      <span>${icon("clock")} ${esc(n.read)}</span>
      <a class="link-arrow" href="article.html?id=${encodeURIComponent(n.id)}">بیشتر ${icon("arrow")}</a>
    </div>
  </article>`;
}

/* ==========================================================================
   برای بیمارستان و کلینیک
   ========================================================================== */
function pageHospitals(D) {
  const S = D.site;
  return `
  <section class="pagehead">
    <div class="wrap">
      <nav class="crumbs" aria-label="مسیر">
        <a href="index.html">خانه</a>${icon("chevron")}<span>بیمارستان و کلینیک</span>
      </nav>
      <h1>پذیرشی که از شب قبل شروع می‌شود.</h1>
      <p class="pagehead__lead">برای مدیر بیمارستان، مسئول پذیرش و پزشکی که چهار دقیقهٔ اول ویزیتش صرف خواندن فرم دست‌نویس می‌شود. تپش همان بخش از کار را برمی‌دارد، بدون اینکه HIS شما را دست بزند.</p>
      <div class="pagehead__actions">
        <a class="btn btn--primary" href="contact.html">${icon("calendar")} رزرو دمو</a>
        <a class="btn btn--ghost" href="#pricing">${icon("chart")} مدل و هزینه</a>
      </div>
      <div class="pageheadart"><img src="${esc(D.images.reception.src)}" alt="${esc(D.images.reception.alt)}" fetchpriority="high" decoding="async"></div>
      <div class="pagehead__meta" style="margin-block-start:20px">
        <span class="chip">${icon("plug")} کنار HIS، نه جایگزین آن</span>
        <span class="chip">${icon("clock")} پایلوت ۳ تا ۷ روز</span>
        <span class="chip chip--sample">اعداد پایلوت، نمونه</span>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      ${secHead({
        eyebrow: "درد امروز",
        title: "پنج چیزی که هر پذیرشی را کند می‌کند.",
        lead: "اگر هیچ‌کدام اینها برای مرکز شما آشنا نیست، تپش احتمالاً به کارتان نمی‌آید — و این را از قبل می‌گوییم.",
      })}
      <div class="pains">
        ${D.hospitalPains
          .map(
            (p, i) => `<div class="pain reveal" data-d="${(i % 3) + 1}">
          <div class="pain__bad"><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></div>
          <div class="pain__div"></div>
          <div class="pain__fix"><p>${esc(p.fix)}</p></div>
        </div>`
          )
          .join("")}
      </div>
    </div>
  </section>

  ${processSection(D)}

  <section class="section section--paper">
    <div class="wrap">
      ${secHead({
        eyebrow: "در عمل",
        title: "سه مدل استقرار؛ یکی را انتخاب می‌کنید، نه همه را.",
        lead: "بیشتر پروژه‌های نرم‌افزاری بیمارستانی از یکپارچه‌سازی بیش‌ازحد شکست می‌خورند. ما با سبک‌ترین مدل شروع می‌کنیم و فقط در صورت نیاز عمیق می‌شویم.",
      })}
      <div class="models">
        ${D.integrationModels
          .map(
            (m, i) => `<article class="model reveal" data-d="${i + 1}">
          <span class="model__tag">${esc(m.tag)}</span>
          <h3>${esc(m.name)}</h3>
          <p class="model__best">${esc(m.best)}</p>
          <p class="model__how">${esc(m.how)}</p>
          <p class="model__time">${icon("clock")} راه‌اندازی: ${esc(m.time)}</p>
        </article>`
          )
          .join("")}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      ${secHead({
        eyebrow: "دسترسی‌ها",
        title: "هر نقش، فقط همان چیزی که لازم دارد.",
        lead: "در محیط بالینی، دسترسی زیاد یعنی ریسک. این جدول همان چیزی است که در تنظیمات پیش‌فرض پیاده شده و قابل تغییر است.",
      })}
      <div class="tablewrap reveal">
        <table class="roles">
          <thead><tr><th>نقش</th><th>می‌بیند</th><th>نمی‌بیند</th></tr></thead>
          <tbody>
            ${D.roles
              .map(
                (r) => `<tr><td>${esc(r.role)}</td><td>${esc(r.sees)}</td><td class="no">${esc(r.not)}</td></tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <div style="margin-block-start:22px">${trustline()}</div>
    </div>
  </section>

  <section class="section section--paper" id="onboarding">
    <div class="wrap">
      ${secHead({
        eyebrow: "استقرار",
        title: "چهار هفته، چهار قدم؛ بدون تعطیلی پذیرش.",
        lead: "هیچ‌وقت همهٔ فرم‌ها را یک‌جا دیجیتال نمی‌کنیم. یک فرم که واقعاً استفاده شود، بهتر از ده فرم نیمه‌کاره است.",
      })}
      <div class="timeline">
        ${D.onboarding
          .map(
            (o, i) => `<div class="tl reveal" data-d="${i + 1}">
          <span class="tl__week">${esc(o.week)}</span>
          <h3>${esc(o.title)}</h3>
          <p>${esc(o.body)}</p>
        </div>`
          )
          .join("")}
      </div>
    </div>
  </section>

  <section class="section" id="pricing">
    <div class="wrap">
      ${secHead({
        eyebrow: "هزینه",
        title: "سه مدل، بدون هزینهٔ پنهان.",
        lead: "قیمت نهایی به ظرفیت و مدل استقرار بستگی دارد؛ اما ساختار شفاف است: هیچ هزینهٔ «اتصال» یا «آموزش اضافه» پنهانی وجود ندارد.",
        action: `<a class="link-arrow" href="contact.html">دریافت پیش‌فاکتور ${icon("arrow")}</a>`,
      })}
      <div class="plans">
        ${D.pricing
          .map(
            (p, i) => `<article class="plan ${p.featured ? "plan--featured" : ""} reveal" data-d="${i + 1}">
          <h3>${esc(p.name)}</h3>
          <div class="plan__price">${esc(p.price)}</div>
          <div class="plan__unit">${esc(p.unit)}</div>
          <ul class="plan__list">${p.items.map((it) => `<li>${esc(it)}</li>`).join("")}</ul>
          <a class="btn ${p.featured ? "btn--light" : "btn--ghost"} btn--block" href="contact.html">${esc(p.cta)}</a>
        </article>`
          )
          .join("")}
      </div>
      <p style="font-size:.78rem;color:var(--muted);margin-block-start:16px">قیمت‌ها در نسخهٔ نهایی با توجه به تعداد تخت، تعداد درمانگاه و مدل استقرار تعیین می‌شود. این صفحه نمونهٔ طراحی است.</p>
    </div>
  </section>

  ${ctaBlock(S, {
    title: "بیایید با یک درمانگاه شروع کنیم.",
    lead: "یک جلسهٔ ۳۰ دقیقه‌ای با تیم پذیرش و پزشک شما کافی است تا بفهمیم تپش کجای جریان شما جا می‌شود.",
    primary: "درخواست دمو",
    secondary: { label: "پرسش‌های متداول", href: "contact.html#faq" },
  })}
`;
}

/* ==========================================================================
   برای بیماران
   ========================================================================== */
function pagePatients(D) {
  const S = D.site;
  const qa = D.faq.patient;
  return `
  <section class="pagehead">
    <div class="wrap">
      <nav class="crumbs" aria-label="مسیر"><a href="index.html">خانه</a>${icon("chevron")}<span>برای بیماران</span></nav>
      <h1>شما فرم را در خانه پر می‌کنید؛ ما صف را کوتاه می‌کنیم.</h1>
      <p class="pagehead__lead">اگر مرکز درمانی شما از تپش استفاده می‌کند، یک پیامک با لینک دریافت می‌کنید. نه اپلیکیشن لازم است، نه حساب کاربری، نه پرداخت. فقط چند دقیقه وقت، در زمان خودتان.</p>
      <div class="pagehead__actions">
        <a class="btn btn--primary" href="#how">${icon("form")} چطور کار می‌کند</a>
        <a class="btn btn--ghost" href="#privacy">${icon("lock")} حریم خصوصی من</a>
      </div>
      <div class="pageheadart"><img src="${esc(D.images.patient.src)}" alt="${esc(D.images.patient.alt)}" fetchpriority="high" decoding="async"></div>
      <div class="pagehead__meta" style="margin-block-start:20px">
        <span class="chip chip--mint"><span class="dot"></span> بدون نصب اپلیکیشن</span>
        <span class="chip">${icon("clock")} حدود ۶ دقیقه</span>
        <span class="chip chip--sample">بدون هزینه برای بیمار</span>
      </div>
    </div>
  </section>

  <section class="section" id="how">
    <div class="wrap">
      ${secHead({ eyebrow: "مسیر شما", title: "چهار قدم، از پیامک تا پذیرش.", lead: "هیچ‌کدام از این قدم‌ها اجباری نیست؛ اگر نتوانستید، همان روز در مرکز هم می‌شود." })}
      <div class="journey">
        ${[
          { n: "۰۱", t: "پیامک دعوت", d: "از شمارهٔ مرکز درمانی خودتان پیامکی با نام همان مرکز می‌آید. لینک مخصوص خود شماست.", w: "۱ دقیقه" },
          { n: "۰۲", t: "ورود با کد", d: "با شمارهٔ موبایل خودتان وارد می‌شوید و یک کد کوتاه دریافت می‌کنید. کسی جز شما به پرونده دسترسی ندارد.", w: "۱ دقیقه" },
          { n: "۰۳", t: "تکمیل فرم", d: "سؤال‌ها متناسب با سن و وضعیت شما نمایش داده می‌شوند؛ فقط چیزی که لازم است پرسیده می‌شود.", w: "۴ دقیقه" },
          { n: "۰۴", t: "پذیرش کوتاه", d: "روز مراجعه فقط کارت شناسایی نشان می‌دهید و پرونده‌تان از قبل آماده است.", w: "۲ دقیقه" },
        ]
          .map(
            (j, i) => `<div class="jstep reveal" data-d="${i + 1}">
          <div class="jstep__num">${j.n}</div>
          <h3>${esc(j.t)}</h3>
          <p>${esc(j.d)}</p>
          <span class="jstep__who">${esc(j.w)}</span>
        </div>`
          )
          .join("")}
      </div>
    </div>
  </section>

  <section class="section section--paper" id="privacy">
    <div class="wrap">
      ${secHead({
        eyebrow: "حریم خصوصی",
        title: "دقیقاً می‌دانید چه چیزی گرفته می‌شود و چرا.",
        lead: "این جدول را عمداً ساده نوشته‌ایم. اگر جمله‌ای در آن برای شما روشن نیست، یعنی ما بد نوشته‌ایم — به ما بگویید.",
      })}
      <div class="tablewrap reveal">
        <table class="roles">
          <thead><tr><th>چه چیزی</th><th>چرا</th><th>چه کسی می‌بیند</th></tr></thead>
          <tbody>
            <tr><td>پاسخ‌های فرم</td><td>پزشک قبل از ویزیت بداند چه چیزی لازم است</td><td>پزشک و پذیرش همان مرکز</td></tr>
            <tr><td>تصویر مدارک</td><td>جلوگیری از گم شدن آزمایش و تصویربرداری</td><td>پزشک و پذیرش همان مرکز</td></tr>
            <tr><td>تصویر لحظه‌ای</td><td>اطمینان از اینکه پرونده به شما تعلق دارد</td><td>پذیرش و پزشک همان مرکز</td></tr>
            <tr><td>فاصلهٔ شما تا مرکز</td><td>تشخیص تکمیل واقعی از راه دور</td><td>فقط عدد فاصله؛ مسیر حرکت ذخیره نمی‌شود</td></tr>
            <tr><td>لاگ مشاهدهٔ پرونده</td><td>اینکه بدانید چه کسی پرونده را دیده</td><td>شما (با درخواست) و ممیز مرکز</td></tr>
          </tbody>
        </table>
      </div>
      <div class="cards" style="margin-block-start:20px">
        ${[
          { i: "shield", t: "می‌توانید مرحله را رد کنید", b: "اگر نمی‌خواهید تصویر یا فاصله ثبت شود، همان مرحله را رد کنید؛ پرونده در مرکز تکمیل می‌شود و خدمت شما قطع نمی‌شود." },
          { i: "lock", t: "تصویر شما توزیع نمی‌شود", b: "تصویر و مدارک فقط برای همان مرکز و همان پرونده است؛ نه در شبکه‌های اجتماعی، نه در تبلیغات، نه در فروش داده." },
          { i: "doc", t: "حذف و اصلاح", b: "تا قبل از پذیرش می‌توانید ویرایش کنید. برای حذف، درخواست ثبت می‌شود و مرکز طبق مقررات خودش پاسخ می‌دهد." },
        ]
          .map(
            (c, i) => `<article class="fcard reveal" data-d="${i + 1}"><div class="icobox">${icon(c.i)}</div><h3>${esc(c.t)}</h3><p>${esc(c.b)}</p></article>`
          )
          .join("")}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      ${secHead({ eyebrow: "پرسش‌های شما", title: "چیزهایی که بیشتر پرسیده می‌شود.", lead: "اگر سوالتان اینجا نیست، از طریق صفحهٔ تماس بپرسید؛ جواب می‌دهیم و اگر لازم بود، به این فهرست اضافه می‌کنیم." })}
      <div class="faq">
        ${qa.map((q, i) => `<details class="qa reveal" ${i === 0 ? "open" : ""}><summary>${esc(q.q)}<i>+</i></summary><p>${esc(q.a)}</p></details>`).join("")}
      </div>
      <p style="font-size:.8rem;color:var(--muted);margin-block-start:16px;max-width:44rem">
        نکتهٔ مهم: پروندهٔ تپش، پروندهٔ رسمی بیمارستان نیست. اطلاعات پیش‌پذیرش برای آماده‌سازی ویزیت استفاده می‌شود و ثبت رسمی طبق روال همان مرکز انجام می‌شود.
      </p>
      <div style="margin-block-start:22px">${trustline()}</div>
    </div>
  </section>

    ${ctaBlock(S, {
    title: "می‌خواهید مرکز درمانی‌تان هم از تپش استفاده کند؟",
    lead: "لینک این صفحه را برای مسئول پذیرش یا پزشک خود بفرستید؛ یا نام مرکز را به ما بگویید تا خودمان پیگیری کنیم.",
    primary: "معرفی مرکز درمانی",
    secondary: { label: "خواندن اخبار محصول", href: "news.html" },
  })}
`;
}

/* ==========================================================================
   مشارکت و دیوار شیشه‌ای
   ========================================================================== */
function pagePartners(D) {
  const S = D.site;
  return `
  <section class="pagehead">
    <div class="wrap">
      <nav class="crumbs" aria-label="مسیر"><a href="index.html">خانه</a>${icon("chevron")}<span>مشارکت و شرکا</span></nav>
      <h1>دیوار شیشه‌ای: هیچ عددی پشت در بسته نیست.</h1>
      <p class="pagehead__lead">همهٔ ما در فروش نرم‌افزار بالینی، لیست مشتری و درصد سهم را در جلسهٔ جداگانه نگه می‌داریم. ما تصمیم گرفتیم برعکسش کنیم: یک داشبورد مشترک، یک منبع داده، یک لاگ قابل بازبینی برای هر دو طرف.</p>
      <div class="pagehead__actions">
        <a class="btn btn--primary" href="contact.html">${icon("handshake")} گفت‌وگوی مشارکت</a>
        <a class="btn btn--ghost" href="#models">${icon("users")} مدل‌های همکاری</a>
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap">
      <div class="glasswrap reveal">
        <div class="glassgrid">
          <div>
            <span class="eyebrow" style="color:#8fcfb4">دیوار شیشه‌ای</span>
            <h2 class="sec__title" style="color:#fff;margin-block-start:12px">همان داشبوردی که ما می‌بینیم، شما هم می‌بینید.</h2>
            <p style="color:rgba(238,243,238,.8);margin-block-start:12px;font-size:.94rem">قرارداد، تعداد پیش‌پذیرش، محاسبهٔ سهم و تاریخ تسویه — همه در یک صفحه، با تاریخچهٔ تغییر. اگر عددی به نفع ما اشتباه باشد، شما همان‌جا می‌بینید.</p>
            <ul class="glasslist" style="margin-block-start:20px">
              ${D.wallRules.map((r) => `<li>${esc(r)}</li>`).join("")}
            </ul>
          </div>
          <div class="glass-card" aria-hidden="true">
            <div class="glass-card__head">
              <span>داشبورد مشترک · قرارداد NBZ-۱۴۰۵-۰۴</span>
              <span class="chip" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.24);color:#eaf6ee">هم‌زمان</span>
            </div>
            <div class="glass-row"><span>پیش‌پذیرش این ماه</span><b>۱٬۲۴۰</b></div>
            <div class="glass-row"><span>نرخ تکمیل</span><b class="up">۸۱٪</b></div>
            <div class="glass-row"><span>سهم شریک معرف</span><b class="up">۱۸٪</b></div>
            <div class="glass-row"><span>مبلغ قابل تسویه</span><b>۱۴۲٬۶۰۰٬۰۰۰ ریال</b></div>
            <div class="glass-row"><span>تاریخ تسویه</span><b>۱۵ آذر ۱۴۰۵</b></div>
            <div class="glassbar"><span data-bar="86"></span></div>
            <p class="glass-note">۸۶٪ از ظرفیت قرارداد استفاده شده · آخرین به‌روزرسانی: امروز ۰۹:۴۰ · نمایش نمونه</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section" id="models">
    <div class="wrap">
      ${secHead({
        eyebrow: "مدل‌های همکاری",
        title: "سه راه برای شریک شدن، با انتظارات روشن.",
        lead: "هر مدل می‌گوید چه چیزی می‌دهید، چه چیزی می‌گیرید و چه چیزی لازم است. جزئیات عددی در توافق‌نامه می‌آید، اما هیچ بندی غافلگیرکننده نیست.",
      })}
      <div class="models">
        ${D.partnerModels
          .map(
            (m, i) => `<article class="model reveal" data-d="${i + 1}">
          <div class="icobox">${icon(m.icon)}</div>
          <h3>${esc(m.title)}</h3>
          <p class="model__how" style="border:0;padding:0;margin:0">${esc(m.body)}</p>
          <p class="model__time">${icon("checkCircle")} ${esc(m.share)}</p>
          <p class="model__best">${icon("users")} لازم است: ${esc(m.need)}</p>
        </article>`
          )
          .join("")}
      </div>
    </div>
  </section>

  <section class="section section--paper">
    <div class="wrap">
      ${secHead({
        eyebrow: "ماشین‌حساب سهم",
        title: "عدد را خودتان حساب کنید.",
        lead: "این ماشین‌حساب فقط برای شفاف کردن ساختار مدل است؛ اعداد نمونه‌اند و تعهد مالی ایجاد نمی‌کنند.",
      })}
      <div class="glassgrid glassgrid--fill" style="align-items:stretch">
        <div class="form reveal" style="align-self:stretch">
          <h3>پیش‌بینی ماهانه</h3>
          <p>سه عدد را جابه‌جا کنید و سهم برآوردی را ببینید.</p>
          <div class="fields">
            <div class="field field--full">
              <label for="calcVolume">تعداد پیش‌پذیرش در ماه: <b id="calcVolumeOut" class="num">۱٬۲۰۰</b></label>
              <input id="calcVolume" type="range" min="100" max="8000" step="50" value="1200">
            </div>
            <div class="field field--full">
              <label for="calcFee">درآمد مرکز از هر پیش‌پذیرش (هزار تومان): <b id="calcFeeOut" class="num">۱۸۰</b></label>
              <input id="calcFee" type="range" min="40" max="600" step="10" value="180">
            </div>
            <div class="field field--full">
              <label for="calcShare">درصد سهم شریک معرف: <b id="calcShareOut" class="num">۱۸٪</b></label>
              <input id="calcShare" type="range" min="5" max="35" step="1" value="18">
            </div>
          </div>
          <p class="form__note">سهم بر اساس قرارداد اول و درصد توافق‌شده محاسبه می‌شود؛ تمدید سالانه درصد کمتری دارد. مالیات و تسویه جداگانه است.</p>
        </div>
        <div class="glass-card" style="background:#0f3a2e;border-color:rgba(255,255,255,.14);display:flex;flex-direction:column;justify-content:center;gap:6px">
          <span style="font-size:.78rem;color:rgba(255,255,255,.6)">سهم برآوردی ماهانه</span>
          <div style="font-size:clamp(1.7rem,3.4vw,2.5rem);font-weight:800;color:#fff;line-height:1.3" id="calcResult" class="num">۳٫۸ میلیون تومان</div>
          <div style="font-size:.82rem;color:rgba(255,255,255,.65)" id="calcResultYear" class="num">سالانه حدود ۴۶ میلیون تومان</div>
          <div class="glassbar" style="margin-block-start:18px"><span id="calcBar" style="width:18%"></span></div>
          <p class="glass-note">محاسبه: تعداد × درآمد × درصد. نمایش نمونه، بدون تعهد.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      ${secHead({ eyebrow: "پرسش‌های شریک", title: "چیزهایی که پیش از امضا باید بدانید.", lead: "اگر جواب یکی از اینها را نپسندیدید، همان‌جا گفت‌وگو را تمام می‌کنیم؛ بهتر از قراردادی که بعداً پشیمانی بیاورد." })}
      <div class="faq">
        ${D.faq.partner.map((q, i) => `<details class="qa reveal" ${i === 0 ? "open" : ""}><summary>${esc(q.q)}<i>+</i></summary><p>${esc(q.a)}</p></details>`).join("")}
      </div>
    </div>
  </section>

  ${ctaBlock(S, {
    title: "سهم ما این است که عدد را نشان بدهیم.",
    lead: "اگر با اصل دیوار شیشه‌ای موافقید، جلسهٔ اول را بگذاریم برای دیدن یک داشبورد واقعی، نه اسلاید.",
    primary: "درخواست جلسهٔ مشارکت",
    secondary: { label: "خواندن مانیفست دیوار شیشه‌ای", href: "article.html?id=glass-wall-model" },
  })}
`;
}

/* ==========================================================================
   اتاق خبر
   ========================================================================== */
function pageNews(D) {
  const S = D.site;
  const featured = D.news.find((n) => n.featured) || D.news[0];
  const rest = D.news.filter((n) => n.id !== featured.id);
  const cats = ["همه", ...Array.from(new Set(D.news.map((n) => n.category)))];
  return `
  <section class="pagehead">
    <div class="wrap">
      <nav class="crumbs" aria-label="مسیر"><a href="index.html">خانه</a>${icon("chevron")}<span>اتاق خبر</span></nav>
      <h1>اتاق خبر تپش</h1>
      <p class="pagehead__lead">انتشار نسخه، قراردادها، گزارش‌های بازار و درس‌های استقرار. هرچه در جلسهٔ فروش می‌گوییم، اینجا هم می‌نویسیم.</p>
      <div class="pagehead__meta">
        <span class="chip">${icon("file")} ${faNum(D.news.length)} مطلب منتشرشده</span>
        <span class="chip chip--sample">بخشی از مطالب نمونه‌اند</span>
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap">
      <div class="newshead reveal">
        <div class="filters" role="group" aria-label="دسته‌ها">
          ${cats.map((c, i) => `<button class="filter" data-filter="${esc(c)}" aria-pressed="${i === 0}">${esc(c)}</button>`).join("")}
        </div>
        <label class="search">${icon("search")}<input type="search" id="newsSearch" placeholder="جست‌وجو در خبرها…" aria-label="جست‌وجو در خبرها"></label>
      </div>
      <div class="newsgrid" id="newsList">
        ${newsCard(featured, true)}
        ${rest.map((n, i) => newsCard(n, false, i)).join("")}
      </div>
      <p class="noresult" id="noResult">مطلبی با این فیلتر پیدا نشد. عبارت دیگری را امتحان کنید.</p>
      <div style="margin-block-start:32px">${trustline()}</div>
    </div>
  </section>

  ${ctaBlock(S, {
    title: "خبرنامهٔ ماهانه را از دست ندهید.",
    lead: "یک ایمیل در ماه: تغییرات محصول، گزارش‌های بازار و آنچه در استقرارها یاد گرفتیم — بدون تبلیغ.",
    primary: "درخواست دمو",
    secondary: { label: "روایت مشتریان", href: "voices.html" },
  })}
`;
}

/* ==========================================================================
   صفحهٔ مقاله
   ========================================================================== */
function pageArticle(D) {
  const S = D.site;
  const id = new URLSearchParams(location.search).get("id");
  const n = D.news.find((x) => x.id === id) || D.news[0];
  const related = D.news.filter((x) => x.id !== n.id).slice(0, 4);
  const im = D.images[n.image] || D.images.reception;

  /* بدنهٔ نمونه: از خلاصه و پاراگراف خبر ساخته می‌شود تا طراحی قابل ارزیابی باشد */
  const prose = `
    <p>${esc(n.body)}</p>
    <blockquote>این صفحه یک نمونهٔ طراحی است: ساختار و طول متن برای ارزیابی خوانایی و چیدمان انتخاب شده است، نه محتوای نهایی خبر.</blockquote>
    <h2>مسئله چه بود؟</h2>
    <p>در جلسه‌های اول با تیم پذیرش، تقریباً همیشه یک جمله تکرار می‌شد: «بیشتر کار ما نوشتن نیست، پرسیدن دوبارهٔ چیزهایی است که قبلاً پرسیده‌ایم.» این جمله نقطهٔ شروع طراحی بود؛ نه اضافه‌کردن یک صفحهٔ دیگر به سیستم موجود، بلکه برداشتن یک مرحله از مسیر روز مراجعه.</p>
    <h2>چه کاری کردیم؟</h2>
    <ul>
      <li>فرم را از کاغذ به یک مسیر موبایلی منتقل کردیم که در خانه هم قابل تکمیل باشد.</li>
      <li>سؤال‌ها را شرطی کردیم تا هر بیمار فقط سؤال مربوط به خودش را ببیند.</li>
      <li>مدارک را با برچسب نوع سند ذخیره کردیم تا در پرونده گم نشود.</li>
      <li>یک لایهٔ احراز حضور اضافه کردیم تا پرونده به یک آدم واقعی گره بخورد.</li>
    </ul>
    <h2>چه چیزی یاد گرفتیم؟</h2>
    <p>سه چیز: اول، پذیرش وقتی همراهی می‌کند که سیستم برایش ساده باشد، نه جامع. دوم، بیمار وقتی فرم را کامل می‌کند که بداند چرا پرسیده می‌شود. سوم، مدیر وقتی تصمیم می‌گیرد که عدد را با چشم خودش ببیند.</p>
    <p>در ادامه، همین سه درس را به شاخص تبدیل کردیم: زمان پذیرش، نرخ تکمیل و نرخ رهاکردن فرم. هر سه در داشبورد مرکز قابل مشاهده‌اند.</p>
    <h2>قدم بعدی</h2>
    <p>نسخهٔ بعدی روی اتصال استاندارد به HIS تمرکز دارد. اگر مرکز شما HIS فعال دارد و می‌خواهید در پایلوت اتصال شرکت کنید، از صفحهٔ تماس پیام بدهید.</p>
  `;

  return `
  <div class="wrap" style="padding-block-start:22px">
    <nav class="crumbs" aria-label="مسیر"><a href="index.html">خانه</a>${icon("chevron")}<a href="news.html">اتاق خبر</a>${icon("chevron")}<span>${esc(n.category)}</span></nav>
  </div>
  <article class="article">
    <div class="wrap article__grid">
      <div>
        <header class="article__head">
          <span class="chip chip--mint">${esc(n.category)}</span>
          <h1>${esc(n.title)}</h1>
          <p class="article__lede">${esc(n.excerpt)}</p>
          <div class="article__meta">
            <span>${esc(n.date)}</span><span class="sep"></span>
            <span>${icon("clock")} ${esc(n.read)} مطالعه</span><span class="sep"></span>
            <span>تیم تپش</span>
            <span class="chip chip--sample" style="margin-inline-start:auto">محتوای نمونه</span>
          </div>
        </header>
        <figure class="article__thumb" style="margin-inline:0">
          <img src="${esc(im.src)}" alt="${esc(im.alt)}" decoding="async">
        </figure>
        <p class="article__cap">${esc(im.credit)} — تصویرسازی برای این نمونهٔ طراحی.</p>
        <div class="prose">${prose}</div>
        <div style="margin-block-start:34px">${trustline()}</div>
      </div>
      <aside class="article__aside">
        <div class="asidecard">
          <h4>در همین موضوع</h4>
          <div class="related">
            ${related.map((r) => `<a href="article.html?id=${encodeURIComponent(r.id)}">${esc(r.title)}</a>`).join("")}
          </div>
        </div>
        <div class="asidecard" style="background:var(--pine);border-color:transparent;color:#eef3ee">
          <h4 style="color:#fff">دموی ۱۵ دقیقه‌ای</h4>
          <p style="color:rgba(238,243,238,.8)">ببینید پرونده در پذیرش و روی صفحهٔ پزشک چه شکلی است.</p>
          <a class="btn btn--light btn--block" href="contact.html">رزرو دمو</a>
        </div>
        <div class="asidecard">
          <h4>دسته‌ها</h4>
          <div class="filters">
            ${[...new Set(D.news.map((x) => x.category))].map((c) => `<a class="filter" href="news.html">${esc(c)}</a>`).join("")}
          </div>
        </div>
      </aside>
    </div>
  </article>
`;
}

/* ==========================================================================
   روایت‌ها
   ========================================================================== */
function pageVoices(D) {
  const S = D.site;
  const tags = ["همه", ...Array.from(new Set(D.voices.map((v) => v.tag)))];
  return `
  <section class="pagehead">
    <div class="wrap">
      <nav class="crumbs" aria-label="مسیر"><a href="index.html">خانه</a>${icon("chevron")}<span>روایت‌ها</span></nav>
      <h1>روایت کسانی که پشت میز پذیرش و اتاق ویزیت هستند.</h1>
      <p class="pagehead__lead">مدیر بیمارستان، مسئول پذیرش، پزشک، کارشناس فناوری اطلاعات و بیمار. هرکدام از زاویهٔ خودشان می‌گویند چه چیزی عوض شد — و چه چیزی نه.</p>
      <div class="pagehead__meta">
        <span class="chip chip--sample">این روایت‌ها نمونه‌اند و برای نمایش طراحی نوشته شده‌اند</span>
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap">
      <div class="filters reveal" style="margin-block-end:22px" role="group" aria-label="فیلتر نقش">
        ${tags.map((t, i) => `<button class="filter" data-vfilter="${esc(t)}" aria-pressed="${i === 0}">${esc(t)}</button>`).join("")}
      </div>
      <div class="voices" id="voiceList">
        ${D.voices.map((v, i) => voiceCard(v, i)).join("")}
      </div>
    </div>
  </section>

  <section class="section section--paper">
    <div class="wrap glassgrid">
      <div>
        ${secHead({ eyebrow: "روش ما", title: "روایت می‌گیریم، اما عدد هم می‌خواهیم.", lead: "هر نقل‌قول با یک شاخص همراه است؛ اگر شاخصی وجود ندارد، نقل‌قول را منتشر نمی‌کنیم." })}
        <p style="font-size:.86rem;color:var(--ink-soft)">برای انتشار روایت کامل با نام مرکز، رضایت کتبی می‌گیریم. در نسخهٔ عمومی، نام‌ها و اعداد قابل بازشناسی حذف یا تجمیعی می‌شوند.</p>
      </div>
      <div class="form">
        <h3>روایت خودتان را بفرستید</h3>
        <p>اگر از تپش استفاده کرده‌اید و چیزی برای گفتن دارید — خوب یا بد — اینجا بنویسید.</p>
        <form data-form="story" novalidate>
          <div class="fields">
            <div class="field"><label for="storyName">نام <span>*</span></label><input id="storyName" name="name" required placeholder="نام و نقش"></div>
            <div class="field"><label for="storyOrg">مرکز درمانی</label><input id="storyOrg" name="org" placeholder="نام مرکز"></div>
            <div class="field field--full"><label for="storyText">روایت شما <span>*</span></label><textarea id="storyText" name="text" required placeholder="چه چیزی عوض شد؟ چه چیزی عوض نشد؟" rows="4"></textarea></div>
          </div>
          <button class="btn btn--primary btn--block" type="submit">ارسال روایت ${icon("arrow")}</button>
          <p class="form__note">با ارسال، اجازهٔ انتشار با نام (پس از تأیید شما) را می‌دهید. نمایش نمونه — چیزی ارسال نمی‌شود.</p>
          <div class="form__ok">روایت شما ثبت شد. تیم ما برای تأیید جزئیات تماس می‌گیرد. (نمونه)</div>
        </form>
      </div>
    </div>
  </section>

  ${ctaBlock(S, {
    title: "نتیجه را با چشم خودتان ببینید.",
    lead: "یک دموی ۱۵ دقیقه‌ای، پروندهٔ واقعی و پذیرش واقعی — بدون نصب.",
    secondary: { label: "اتاق خبر", href: "news.html" },
  })}
`;
}

function voiceCard(v, i) {
  const tone = i % 3 === 1 ? "avatar--pulse" : i % 3 === 2 ? "avatar--sand" : "";
  const initials = v.name.replace("دکتر ", "").trim().split(" ")[0].slice(0, 1) + (v.name.split(" ")[1] || "").slice(0, 1);
  return `<article class="voice reveal" data-voice data-tag="${esc(v.tag)}" data-d="${(i % 3) + 1}">
    <p class="voice__quote">«${esc(v.quote)}»</p>
    <div class="voice__who">
      <span class="avatar ${tone}" aria-hidden="true">${esc(initials)}</span>
      <div>
        <div class="voice__name">${esc(v.name)}</div>
        <div class="voice__role">${esc(v.role)} · ${esc(v.city)}</div>
      </div>
      <span class="voice__tag" style="margin-inline-start:auto">${esc(v.tag)}</span>
    </div>
  </article>`;
}

/* ==========================================================================
   دربارهٔ تپش
   ========================================================================== */
function pageAbout(D) {
  const S = D.site;
  return `
  <section class="pagehead">
    <div class="wrap">
      <nav class="crumbs" aria-label="مسیر"><a href="index.html">خانه</a>${icon("chevron")}<span>دربارهٔ تپش</span></nav>
      <h1>ما یک قدم از مسیر درمان را برمی‌داریم، نه بیشتر.</h1>
      <p class="pagehead__lead">تپش از دل یک سؤال ساده ساخته شد: چرا بیمار باید همان اطلاعاتی را که در خانه می‌تواند بدهد، در صف پذیرش و در اتاق ویزیت دوباره بگوید؟</p>
    </div>
  </section>

  <section class="section">
    <div class="wrap glassgrid">
      <div>
        ${secHead({ eyebrow: "چرا", title: "زمان پزشک گران‌ترین منبع درمان است.", lead: "هر دقیقه‌ای که صرف رمزگشایی فرم دست‌نویس می‌شود، از دقت تشخیص کم می‌شود. تپش این دقیقه را برمی‌گرداند." })}
        <p style="font-size:.9rem;color:var(--ink-soft)">ما نه جایگزین پزشک هستیم، نه جایگزین HIS. یک لایهٔ ورودی هستیم که کیفیت داده را بالا می‌برد و بار اداری را از دوش پذیرش برمی‌دارد. این محدودیت را آگاهانه انتخاب کردیم: هرچه ادعای بزرگ‌تر، استقرار کندتر و ریسک بیشتر.</p>
      </div>
      <div class="panel" style="transform:none">
        <div class="panel__top">
          <span class="panel__title"><i>${icon("pulse")}</i> در یک نگاه</span>
          <span class="chip chip--mint">۱۸ ماه</span>
        </div>
        <div class="panel__body">
          <div class="prow"><span class="prow__label">نسخهٔ فعال</span><span class="prow__val">۱٫۲ — فرم‌ساز شرطی</span></div>
          <div class="prow"><span class="prow__label">مدل استقرار</span><span class="prow__val">ابر / داخلی / هیبرید</span></div>
          <div class="prow"><span class="prow__label">دامنه</span><span class="prow__val">پیش‌پذیرش و پذیرش ورودی</span></div>
          <div class="prow"><span class="prow__label">مالکیت داده</span><span class="prow__val ok">${icon("check")} مرکز درمانی</span></div>
          <div class="ptrack"><span style="width:62%"></span></div>
          <div class="pfoot">${icon("doc")} <span>مسیر نسخهٔ بعدی: اتصال استاندارد HIS</span></div>
        </div>
      </div>
    </div>
  </section>

  <section class="section section--paper">
    <div class="wrap">
      ${secHead({ eyebrow: "اصول", title: "چهار قاعده که سر آن‌ها معامله نمی‌کنیم.", lead: "اینها شعار تبلیغاتی نیستند؛ اگر قابلیتی یکی از اینها را نقض کند، منتشر نمی‌شود." })}
      <div class="cards" style="grid-template-columns:repeat(2,1fr)">
        ${D.principles
          .map(
            (p, i) => `<article class="fcard reveal" data-d="${i + 1}">
          <span class="eyebrow">اصل ${faNum(i + 1)}</span>
          <h3 style="margin-block-start:8px">${esc(p.title)}</h3>
          <p>${esc(p.body)}</p>
        </article>`
          )
          .join("")}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      ${secHead({ eyebrow: "مسیر", title: "از پیش‌پذیرش تا پذیرش بدون کاغذ.", lead: "در دو سال آینده، نسخه‌ها را بر اساس بازخورد مراکز منتشر می‌کنیم؛ نه بر اساس آنچه در اسلایدها جذاب‌تر است." })}
      <div class="timeline">
        ${D.roadmap
          .map(
            (r, i) => `<div class="tl reveal" data-d="${i + 1}">
          <span class="tl__week">${esc(r.when)} ${r.done ? "· منتشر شده" : ""}</span>
          <h3>${esc(r.title)}</h3>
          <p>${esc(r.body)}</p>
        </div>`
          )
          .join("")}
      </div>

      ${
        D.lead
          ? `<article class="leadcard reveal">
        <div class="leadcard__id">
          <span class="avatar leadcard__avatar">${esc(D.lead.initials || "م‌ف")}</span>
          <div>
            <span class="leadcard__role">${esc(D.lead.role)}</span>
            <h3>${esc(D.lead.name)}</h3>
            <a class="leadcard__link" href="${esc(D.lead.site)}" target="_blank" rel="noopener noreferrer">
              ${esc(D.lead.siteLabel || D.lead.site)} ${icon("arrowUp")}
            </a>
          </div>
        </div>
        <div class="leadcard__body">
          <p>${esc(D.lead.bio)}</p>
          <p class="leadcard__why">${icon("quote")} <span>${esc(D.lead.why)}</span></p>
          <ul class="leadcard__focus">
            ${(D.lead.focus || []).map((f) => `<li>${icon("check")}<span>${esc(f)}</span></li>`).join("")}
          </ul>
          <p class="leadcard__note">${esc(D.lead.note)}</p>
        </div>
      </article>`
          : ""
      }

      <div class="cards" style="margin-block-start:40px">
        ${D.team
          .map(
            (t, i) => `<article class="fcard reveal" data-d="${i + 1}" style="display:flex;gap:14px;align-items:center">
          <span class="avatar" style="width:46px;height:46px">${esc(t.initials)}</span>
          <div><h3 style="margin:0">${esc(t.name)}</h3><p style="margin-block-start:2px">${esc(t.role)}</p></div>
        </article>`
          )
          .join("")}
      </div>
    </div>
  </section>

  ${ctaBlock(S, {
    title: "اگر برایتان سؤال است، بپرسید.",
    lead: "بدون فرم پیچیده، بدون مراحل فروش. یک پیام کوتاه و یک جواب روشن.",
    primary: "تماس با ما",
    secondary: { label: "دیدن اخبار", href: "news.html" },
  })}
`;
}

/* ==========================================================================
   تماس و دمو
   ========================================================================== */
function pageContact(D) {
  const S = D.site;
  const faqItems = [...D.faq.general, ...D.faq.hospital.slice(0, 2)];
  return `
  <section class="pagehead">
    <div class="wrap">
      <nav class="crumbs" aria-label="مسیر"><a href="index.html">خانه</a>${icon("chevron")}<span>تماس و دمو</span></nav>
      <h1>یک جلسهٔ ۱۵ دقیقه‌ای، بدون اسلاید.</h1>
      <p class="pagehead__lead">پروندهٔ یک بیمار نمونه را باز می‌کنیم، صف پذیرش را با شما مرور می‌کنیم و اگر تپش به کارتان نیاید، همان‌جا می‌گوییم.</p>
      <div class="pagehead__meta">
        <span class="chip chip--mint">${icon("clock")} پاسخ در یک روز کاری</span>
        <span class="chip">${icon("phone")} ${esc(S.phone)}</span>
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap glassgrid glassgrid--fill" style="align-items:start">
      <div>
        <div class="form">
          <h3>درخواست دمو یا گفت‌وگو</h3>
          <p>هرچه بیشتر دربارهٔ مرکزتان بدانیم، جلسهٔ اول مفیدتر است.</p>
          <form data-form="demo" novalidate>
            <div class="fields">
              <div class="field"><label for="fName">نام و نام خانوادگی <span>*</span></label><input id="fName" name="name" required placeholder="مثلاً مریم تهرانی"></div>
              <div class="field"><label for="fRole">نقش</label>
                <select id="fRole" name="role">
                  <option>مدیر بیمارستان</option>
                  <option>مسئول پذیرش</option>
                  <option>پزشک</option>
                  <option>مدیر فناوری اطلاعات</option>
                  <option>شریک / معرف</option>
                  <option>سایر</option>
                </select>
              </div>
              <div class="field"><label for="fOrg">نام مرکز درمانی <span>*</span></label><input id="fOrg" name="org" required placeholder="بیمارستان / کلینیک"></div>
              <div class="field"><label for="fPhone">موبایل <span>*</span></label><input id="fPhone" name="phone" required inputmode="tel" placeholder="۰۹۱۲…" dir="ltr"></div>
              <div class="field field--full"><label for="fPhone">موضوع</label>
                <select id="fTopic" name="topic">${D.contactTopics.map((t) => `<option>${esc(t)}</option>`).join("")}</select>
              </div>
              <div class="field field--full"><label for="fNote">توضیح کوتاه</label><textarea id="fNote" name="note" placeholder="چند تخت؟ چند درمانگاه؟ چه چیزی بیشتر اذیت می‌کند؟"></textarea></div>
            </div>
            <button class="btn btn--primary btn--block" type="submit">${icon("calendar")} ارسال درخواست</button>
            <p class="form__note">این فرم یک نمونهٔ طراحی است و اطلاعاتی ارسال نمی‌کند. در نسخهٔ واقعی، درخواست به تیم فروش و پشتیبانی می‌رسد.</p>
            <div class="form__ok">درخواست شما ثبت شد. در ساعات کاری، حداکثر یک روز کاری بعد تماس می‌گیریم. (نمونه)</div>
          </form>
        </div>
      </div>
      <div style="display:grid;gap:14px">
        <div class="asidecard">
          <h4>راه‌های تماس</h4>
          <ul style="display:grid;gap:12px;font-size:.88rem;margin-block-start:10px">
            <li style="display:flex;gap:10px">${icon("phone")}<a href="tel:${esc(S.phoneHref)}" dir="ltr">${esc(S.phone)}</a></li>
            <li style="display:flex;gap:10px">${icon("mail")}<a href="mailto:${esc(S.email)}" dir="ltr">${esc(S.email)}</a></li>
            <li style="display:flex;gap:10px">${icon("pin")}<span>${esc(S.address)}</span></li>
            <li style="display:flex;gap:10px">${icon("clock")}<span>${esc(S.hours)}</span></li>
          </ul>
        </div>
        <div class="asidecard">
          <h4>برای رسانه</h4>
          <p>مصاحبه، آمار و تصاویر محصول: <a href="mailto:${esc(S.pressEmail)}" dir="ltr" style="color:var(--teal);font-weight:600">${esc(S.pressEmail)}</a></p>
        </div>
        <div class="asidecard" style="background:var(--mint);border-color:#c8e3d1">
          <h4>مرکز فعال هستید؟</h4>
          <p>برای پشتیبانی عملیاتی، شمارهٔ قرارداد را در موضوع پیام بنویسید تا سریع‌تر مسیر پیدا شود.</p>
        </div>
        <div class="trustline" style="display:block">
          <b style="display:block;margin-block-end:8px">پیش از جلسه بدانید</b>
          <div class="trustline__items" style="display:grid;gap:8px">
            <span>${icon("check")} نیازی به نصب چیزی نیست</span>
            <span>${icon("check")} داده‌ای از شما گرفته نمی‌شود</span>
            <span>${icon("check")} اگر مناسب نبود، صریح می‌گوییم</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section section--paper" id="faq">
    <div class="wrap">
      ${secHead({ eyebrow: "پرسش‌های متداول", title: "پیش از تماس، شاید جوابش اینجا باشد.", lead: "برای مدیر مرکز درمانی، برای بیمار و برای شریک — جداگانه دسته‌بندی شده است." })}
      <div class="faqtabs reveal" role="group" aria-label="دستهٔ پرسش">
        <button class="filter" data-faqtab="general" aria-pressed="true">عمومی</button>
        <button class="filter" data-faqtab="hospital" aria-pressed="false">مرکز درمانی</button>
        <button class="filter" data-faqtab="patient" aria-pressed="false">بیمار</button>
        <button class="filter" data-faqtab="partner" aria-pressed="false">شریک</button>
      </div>
      <div class="faq" id="faqBox">
        ${faqItems.map((q, i) => `<details class="qa" ${i === 0 ? "open" : ""}><summary>${esc(q.q)}<i>+</i></summary><p>${esc(q.a)}</p></details>`).join("")}
      </div>
    </div>
  </section>
`;
}

/* ==========================================================================
   راه‌اندازی
   ========================================================================== */

/* ==========================================================================
   مسیر پرونده — پنج ایستگاه از پیش‌پذیرش تا پروندهٔ الکترونیک
   content/process.json
   ========================================================================== */
function processSection(D) {
  const P = D.process;
  if (!P || !Array.isArray(P.stages) || !P.stages.length) return "";
  const img = (key) => (key && D.images?.[key] ? D.images[key] : null);
  const fa = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

  const rail = P.stages
    .map(
      (st, i) => `<li class="px-rail__i">
        <button type="button" class="px-rail__b${i === 0 ? " is-on" : ""}" data-stage="${esc(st.key)}"
          aria-pressed="${i === 0 ? "true" : "false"}">
          <span class="px-rail__n">${esc(st.num)}</span>
          <span class="px-rail__t">${esc(st.title.split("—")[0].trim())}</span>
        </button>
      </li>`
    )
    .join("");

  const blocks = P.stages
    .map((st, i) => {
      const im = img(st.image);
      return `<article class="px-card reveal" data-step="${esc(st.key)}" id="px-${esc(st.key)}">
        <header class="px-card__head">
          <span class="px-card__n">${esc(st.num)}</span>
          <div class="px-card__ttl">
            <span class="px-card__role">ایستگاه ${esc(st.num)} از ${fa(P.stages.length)}</span>
            <h3>${esc(st.title)}</h3>
          </div>
        </header>

        <div class="px-card__body">
          <div class="px-card__txt">
            <p class="px-card__lead">${esc(st.lead)}</p>
            <ul class="px-card__list">
              ${st.points.map((pt) => `<li>${icon("check")}<span>${esc(pt)}</span></li>`).join("")}
            </ul>
          </div>
          ${
            im
              ? `<figure class="px-card__fig">
                  <img src="${esc(im.src)}" alt="${esc(im.alt)}" loading="lazy" decoding="async">
                  <figcaption>${esc(im.credit)}</figcaption>
                </figure>`
              : `<aside class="px-card__panel">
                  <span class="px-card__panelK">${icon(st.icon)}</span>
                  <b>${esc(st.title.split("—")[0].trim())}</b>
                  <p>${esc(st.handoff)}</p>
                  <span class="px-card__panelTime">${icon("clock")} ${esc(st.minutes)}</span>
                </aside>`
          }
        </div>

        <footer class="px-card__foot">
          <div class="px-card__facts">
            <span class="px-fact">${icon("clock")}<b>${esc(st.minutes)}</b></span>
            <span class="px-fact">${icon("users")}<b>${esc(st.who)}</b></span>
          </div>
          <span class="px-card__next">${icon("arrow")}
            <span>${i < P.stages.length - 1 ? "تحویل به ایستگاه بعد" : "تحویل نهایی"}
              <b>${esc(st.handoff)}</b></span>
          </span>
        </footer>
      </article>`;
    })
    .join("");

  return `<section class="section section--paper" id="process">
    <div class="wrap">
      ${secHead({ eyebrow: P.eyebrow, title: P.title, lead: P.lead })}
      <div class="px">
        <div class="px-head">
          <span class="px-head__label">${icon("pulse")} این مسیر را ببینید</span>
          <span class="px-head__hint">روی هر ایستگاه بزنید تا به همان بخش بروید</span>
        </div>
        <div class="px-rail__wrap">
          <ol class="px-rail">${rail}</ol>
        </div>
        <div class="px-steps">${blocks}</div>
        <div class="px-bound">
          ${icon("shield")}
          <p><b>مرز محصول:</b> ${esc(P.boundary)}</p>
        </div>
      </div>
    </div>
  </section>`;
}

const PAGE_RENDERERS = {
  index: pageIndex,
  hospitals: pageHospitals,
  patients: pagePatients,
  partners: pagePartners,
  news: pageNews,
  article: pageArticle,
  voices: pageVoices,
  about: pageAbout,
  contact: pageContact,
};

const HERO_COPY = {
  hospital: {
    lead: "تپش اطلاعات، مدارک و شواهد حضور بیمار را پیش از روز مراجعه جمع می‌کند؛ پذیرش از صف کاغذی به یک کنترل هویت کوتاه تبدیل می‌شود و پزشک پروندهٔ خوانا را قبل از ورود بیمار می‌بیند.",
    cta: "رزرو دموی ۱۵ دقیقه‌ای",
    second: "مسیر پرونده را ببینید",
    ctaHref: "contact.html",
    secondHref: "#process",
  },
  patient: {
    lead: "اگر مرکز درمانی شما از تپش استفاده می‌کند، با یک پیامک فرم را در خانه پر می‌کنید و روز مراجعه فقط کارت شناسایی نشان می‌دهید. بدون نصب اپلیکیشن، بدون هزینه. و پیش از هر آپلود، دقیقاً می‌دانید چه داده‌ای گرفته می‌شود، چرا، و چه کسی آن را می‌بیند.",
    cta: "بیمار هستم؛ چه داده‌ای می‌گیرید؟",
    second: "مسیر پرونده را ببینید",
    ctaHref: "patients.html#privacy",
    secondHref: "#process",
  },
  partner: {
    lead: "مدل درآمدی ما یک داشبورد مشترک است: قرارداد، تعداد پیش‌پذیرش، محاسبهٔ سهم و تسویه، همه در یک صفحه و با یک منبع داده. به اصل «دیوار شیشه‌ای» متعهدیم.",
    cta: "دیدن مدل مشارکت",
    second: "محاسبهٔ سهم",
    ctaHref: "partners.html",
    secondHref: "partners.html#models",
  },
};

function initNav() {
  const toggle = $("#navToggle");
  const links = $("#navLinks");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      links.classList.toggle("open", !open);
    });
    links.addEventListener("click", (e) => {
      if (e.target.closest("a") && links.classList.contains("open")) {
        toggle.setAttribute("aria-expanded", "false");
        links.classList.remove("open");
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && links.classList.contains("open")) {
        toggle.setAttribute("aria-expanded", "false");
        links.classList.remove("open");
        toggle.focus();
      }
    });
  }
  // نوار پیشرفت مطالعه: فقط وقتی صفحه اسکرول‌پذیر است معنا دارد
  const bar = $("#readProgress");
  if (bar) {
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      bar.style.width = max > 0 ? `${Math.min(100, (doc.scrollTop / max) * 100)}%` : "0%";
    };
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
  }
}

function initHeroSwitch() {
  const buttons = $$("[data-aud]");
  if (!buttons.length) return;
  const lead = $("#heroLead");
  const cta = $("#heroCta");
  const second = $("#heroSecond");
  buttons.forEach((b) => {
    b.addEventListener("click", () => {
      buttons.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      const copy = HERO_COPY[b.dataset.aud];
      if (!copy) return;
      lead.textContent = copy.lead;
      cta.querySelector("span").textContent = copy.cta;
      second.querySelector("span").textContent = copy.second;
      cta.setAttribute("href", copy.ctaHref);
      second.setAttribute("href", copy.secondHref);
    });
  });
}

/* مسیر پرونده: با اسکرول، ایستگاه فعال در نوار بالا مشخص می‌شود و
   کلیک روی نوار به همان ایستگاه می‌رود. */
function initProcess() {
  const steps = $$(".px-step[data-step]");
  if (!steps.length) return;
  const chips = $$(".px-rail__b[data-stage]");
  const setOn = (key) => {
    chips.forEach((c) => {
      const on = c.dataset.stage === key;
      c.classList.toggle("is-on", on);
      c.setAttribute("aria-pressed", String(on));
    });
    /* فقط نوار افقی را جابه‌جا می‌کنیم — scrollIntoView کل صفحه را می‌کشید */
    const rail = chips[0]?.closest(".px-rail");
    const on = chips.find((c) => c.dataset.stage === key);
    if (!rail || !on) return;
    const a = on.getBoundingClientRect();
    const b = rail.getBoundingClientRect();
    if (a.left < b.left + 8) rail.scrollLeft += a.left - b.left - 8;
    else if (a.right > b.right - 8) rail.scrollLeft += a.right - b.right + 8;
  };
  chips.forEach((c) => {
    c.addEventListener("click", () => {
      const el = document.getElementById(`px-${c.dataset.stage}`);
      if (!el) return;
      const off = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h"), 10) || 68;
      const top = el.getBoundingClientRect().top + window.scrollY - off - 16;
      window.scrollTo({ top, behavior: "smooth" });
      setOn(c.dataset.stage);
    });
  });
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      const hit = entries
        .filter((en) => en.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (hit) setOn(hit.target.dataset.step);
    },
    { rootMargin: "-30% 0px -50% 0px", threshold: [0.05, 0.3, 0.6] }
  );
  steps.forEach((el) => io.observe(el));
}

function initReveal() {
  const items = $$(".reveal");
  if (!items.length) return;
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  items.forEach((el) => io.observe(el));
}

function initGlassBars() {
  const bars = $$("[data-bar]");
  if (!bars.length) return;
  const paint = () => bars.forEach((b) => (b.style.width = `${b.dataset.bar}%`));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((en) => {
      en.forEach((e) => {
        if (e.isIntersecting) {
          paint();
          io.disconnect();
        }
      });
    });
    io.observe(bars[0].closest(".glass-card") || bars[0]);
  } else paint();
}

function initNewsFilter() {
  const list = $("#newsList");
  if (!list) return;
  const filters = $$("[data-filter]");
  const search = $("#newsSearch");
  const none = $("#noResult");
  let cat = "همه";
  const featured = $(".ncard--featured", list);

  const apply = () => {
    const q = (search?.value || "").trim();
    let visible = 0;
    $$("[data-news]", list).forEach((card) => {
      const isFeatured = card.classList.contains("ncard--featured");
      const c = card.querySelector(".ncard__cat").textContent.split("·")[0].trim();
      const matchesCat = cat === "همه" || c === cat;
      const matchesQ = !q || card.textContent.includes(q);
      // کارت تیتر یک فقط در حالت «همه و بدون جست‌وجو» شکل ویژه دارد؛ در حالت فیلتر،
      // همان خبر به‌صورت کارت معمولی در شبکه می‌نشیند تا نتیجه از دست نرود.
      const featuredLayout = cat === "همه" && !q;
      if (isFeatured) card.classList.toggle("ncard--featured", featuredLayout);
      const show = matchesCat && matchesQ;
      card.style.display = show ? "" : "none";
      if (show) visible++;
    });
    if (none) none.classList.toggle("show", visible === 0);
  };

  filters.forEach((f) => {
    f.addEventListener("click", () => {
      filters.forEach((x) => x.setAttribute("aria-pressed", String(x === f)));
      cat = f.dataset.filter;
      apply();
    });
  });
  search?.addEventListener("input", apply);
}

function initVoiceFilter() {
  const list = $("#voiceList");
  if (!list) return;
  const filters = $$("[data-vfilter]");
  filters.forEach((f) => {
    f.addEventListener("click", () => {
      filters.forEach((x) => x.setAttribute("aria-pressed", String(x === f)));
      const tag = f.dataset.vfilter;
      $$("[data-voice]", list).forEach((card) => {
        card.style.display = tag === "همه" || card.dataset.tag === tag ? "" : "none";
      });
    });
  });
}

function initFaqTabs() {
  const box = $("#faqBox");
  if (!box) return;
  const tabs = $$("[data-faqtab]");
  tabs.forEach((t) => {
    t.addEventListener("click", () => {
      tabs.forEach((x) => x.setAttribute("aria-pressed", String(x === t)));
      const items = DATA_CACHE.faq[t.dataset.faqtab] || [];
      box.innerHTML = items
        .map((q, i) => `<details class="qa" ${i === 0 ? "open" : ""}><summary>${esc(q.q)}<i>+</i></summary><p>${esc(q.a)}</p></details>`)
        .join("");
    });
  });
}

function initForms() {
  $$("form[data-form]").forEach((form) => {
    const kind = form.dataset.form;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const required = $$("[required]", form);
      const invalid = required.find((el) => !el.value.trim());
      if (invalid) {
        invalid.focus();
        invalid.style.borderColor = "#d99a86";
        invalid.addEventListener("input", () => (invalid.style.borderColor = ""), { once: true });
        return;
      }
      const ok = form.querySelector(".form__ok");
      if (ok) ok.classList.add("show");
      if (kind === "newsletter") {
        const note = document.querySelector('[data-ok="newsletter"]');
        if (note) {
          note.textContent = "ثبت شد (نمونه). ممنون که همراه ما هستید.";
          note.style.color = "#a9dcc3";
        }
      }
      form.reset();
    });
  });
}

function initCalculator() {
  const volume = $("#calcVolume");
  if (!volume) return;
  const fee = $("#calcFee");
  const share = $("#calcShare");
  const vOut = $("#calcVolumeOut");
  const fOut = $("#calcFeeOut");
  const sOut = $("#calcShareOut");
  const res = $("#calcResult");
  const resYear = $("#calcResultYear");
  const bar = $("#calcBar");

  const money = (v) => `${v.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} میلیون تومان`;

  const calc = () => {
    const v = Number(volume.value);
    const f = Number(fee.value) / 1000; // هزار تومان → میلیون تومان
    const s = Number(share.value) / 100;
    const monthly = v * f * s; // میلیون تومان
    vOut.textContent = v.toLocaleString("fa-IR");
    fOut.textContent = Number(fee.value).toLocaleString("fa-IR");
    sOut.textContent = `${s * 100}٪`.replace(/\d+/g, (d) => Number(d).toLocaleString("fa-IR"));
    res.textContent = money(monthly);
    resYear.textContent = `سالانه حدود ${money(monthly * 12)}`;
    if (bar) bar.style.width = `${Math.min(100, (v / 8000) * 100)}%`;
  };
  [volume, fee, share].forEach((el) => el.addEventListener("input", calc));
  calc();
}

/* ---------- اجرا ---------- */
let DATA_CACHE = null;

/* بارگذاری همهٔ فایل‌های محتوا به‌صورت موازی و ادغام در یک شیء */
async function loadContent() {
  const parts = await Promise.all(
    DATA_PATHS.map(async (path) => {
      const res = await fetch(path, { cache: "no-cache" });
      if (!res.ok) throw new Error(`${path} (${res.status})`);
      try {
        return await res.json();
      } catch {
        throw new Error(`${path} — JSON نامعتبر است`);
      }
    })
  );
  const merged = Object.assign({}, ...parts);
  const problems = validateContent(merged);
  if (problems.length) console.warn("[news] هشدار محتوا:\n- " + problems.join("\n- "));
  return merged;
}

/* اعتبارسنجی سبک: کلیدهای حیاتی صفحه‌ها را قبل از رندر چک می‌کند تا
   یک فایل ناقص، کل سایت را با صفحهٔ سفید روبه‌رو نکند. */
function validateContent(D) {
  const problems = [];
  const need = [
    ["site.nav", () => Array.isArray(D.site?.nav) && D.site.nav.length > 0],
    ["site.phone/email", () => Boolean(D.site?.phone && D.site?.email)],
    ["images.reception", () => Boolean(D.images?.reception?.src)],
    ["stats (۴ مورد)", () => Array.isArray(D.stats) && D.stats.length === 4],
    ["features", () => Array.isArray(D.features) && D.features.length >= 3],
    ["news", () => Array.isArray(D.news) && D.news.length > 0],
    ["voices", () => Array.isArray(D.voices) && D.voices.length > 0],
    ["faq.general", () => Array.isArray(D.faq?.general) && D.faq.general.length > 0],
  ];
  need.forEach(([name, ok]) => {
    if (!ok()) problems.push(`${name} تعریف نشده یا ناقص است`);
  });
  (D.news || []).forEach((n, i) => {
    if (!n.id || !n.title) problems.push(`news[${i}]: id یا title خالی است`);
    if (n.image && D.images && !D.images[n.image]) problems.push(`news[${i}]: تصویر «${n.image}» در images نیست`);
  });
  return problems;
}

async function boot() {
  const page = currentPage();
  const root = $("#app");
  try {
    const D = await loadContent();
    renderAll(D, page);
    if (DEV) startDevWatch(page);
  } catch (err) {
    renderError(root, err);
    console.error(err);
  }
}

/* رندر کامل صفحه؛ در حالت dev برای اعمال تغییر بدون از دست رفتن اسکرول استفاده می‌شود */
function renderAll(D, page) {
  const root = $("#app");
  DATA_CACHE = D;
  IMG = D.images || {};
  const keepScroll = window.scrollY;

  const pageTitle = PAGE_TITLES[page] || "";
  document.title = page === "index" ? `${D.site.brandFa} — ${D.site.descriptor}` : `${pageTitle} | ${D.site.brandFa}`;

  root.innerHTML =
    `<a class="skip" href="#main">رفتن به محتوای اصلی</a>` +
    headerBlock(D.site, page) +
    `<main id="main">${PAGE_RENDERERS[page](D)}</main>` +
    footerBlock(D.site) +
    mobileNav(D.site, page);

  initNav();
  initHeroSwitch();
  initReveal();
  initGlassBars();
  initNewsFilter();
  initVoiceFilter();
  initFaqTabs();
  initForms();
  initCalculator();
  initProcess();
  // در ری‌لود زندهٔ محتوا، جای اسکرول کاربر حفظ می‌شود
  if (keepScroll > 0) {
    try {
      window.scrollTo({ top: Math.min(keepScroll, document.body.scrollHeight), behavior: "instant" });
    } catch {
      window.scrollTo(0, keepScroll);
    }
  }
}

function renderError(root, err) {
  root.innerHTML = `<div class="wrap" style="padding-block:80px;text-align:center">
    <h1 style="font-size:1.4rem">محتوا بارگذاری نشد</h1>
    <p style="color:#6d837b;font-size:.9rem;margin-block-start:8px">این نمونه باید از یک سرور محلی باز شود (نه با دوبار کلیک روی فایل).</p>
    <pre style="margin-block-start:12px;font-size:.78rem;color:#a8503a;white-space:pre-wrap">${esc(err.message)}</pre>
    <p style="color:#6d837b;font-size:.78rem;margin-block-start:10px">اگر JSON را تازه ویرایش کرده‌اید، احتمالاً یک کاما یا آکولاد جا افتاده است.</p>
  </div>`;
}

/* بارگذاری زندهٔ محتوا در حالت dev: با تغییر هر فایل content/*.json صفحه بازسازی می‌شود */
function startDevWatch(page) {
  let stamp = "";
  const tick = async () => {
    try {
      const res = await fetch("content/site.json", { cache: "no-store" });
      const body = await res.text();
      const next = `${body.length}:${body.slice(-40)}`;
      if (stamp && next !== stamp) {
        const D = await loadContent();
        renderAll(D, page);
        console.info("[news] محتوا به‌روز شد — بدون رفرش");
      }
      stamp = next;
    } catch {}
    setTimeout(tick, DEV_WATCH_MS);
  };
  setTimeout(tick, DEV_WATCH_MS);
  console.info("[news] حالت توسعه فعال است: تغییر فایل‌های content/*.json خودکار اعمال می‌شود.");
}

const PAGE_TITLES = {
  index: "پیش‌پذیرش سلامت",
  hospitals: "برای بیمارستان و کلینیک",
  patients: "برای بیماران",
  partners: "مشارکت و دیوار شیشه‌ای",
  news: "اتاق خبر",
  article: "خبر",
  voices: "روایت‌ها",
  about: "دربارهٔ ما",
  contact: "تماس و دمو",
};

document.addEventListener("DOMContentLoaded", boot);
