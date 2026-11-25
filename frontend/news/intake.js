/*
 File: frontend/news/intake.js
 Description: بلوک قابل‌استفادهٔ «ساختار پروندهٔ پیش‌پذیرش» — از دادهٔ واقعی content/intake.json
 Parent Dependencies: content/intake.json, styles.css (.ip-*)

 استفاده در هر صفحه:
   intakeBlock({ pathway: "CORP_MEN_GE40", variant: "full" })
   intakeBlock({ form: "cancer_screening_male_v02", variant: "compact" })
*/

let INTAKE_CACHE = null;

export async function loadIntake() {
  if (INTAKE_CACHE) return INTAKE_CACHE;
  const res = await fetch("content/intake.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`intake.json: ${res.status}`);
  INTAKE_CACHE = await res.json();
  return INTAKE_CACHE;
}

const esc2 = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ── آیکون‌های کوچک محلی (بدون وابستگی به app.js) ── */
const I = {
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  doc: '<path d="M13.5 3.5H7A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V9.5l-6-6Z"/><path d="M13 3.8V10h6"/>',
  shield: '<path d="M12 3l7.5 3v6c0 4.5-3 8.2-7.5 9.5C7.5 20.2 4.5 16.5 4.5 12V6L12 3Z"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  arrow: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
  chevron: '<path d="m15 18-6-6 6-6"/>',
  pulse: '<path d="M2 12h4l2.5-7 4 14 3-9 2.5 2H22"/>',
  pin: '<path d="M20 10.5c0 5.5-8 11.5-8 11.5s-8-6-8-11.5a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10.2" r="2.6"/>',
};
const ic = (n, cls = "") =>
  `<svg class="ip-ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ""}</svg>`;

/* ── توضیح فارسی نوع فیلد ── */
const TYPE_FA = {
  text: "متن",
  number: "عدد",
  date: "تاریخ",
  select: "انتخابی",
  yn_unk: "بله / خیر / نمی‌دانم",
  province_city: "استان و شهر",
  residence_address: "نشانی",
};

/**
 * کارت انتخاب پکیج: چهار مسیر چکاپ با تعداد سوال واقعی همان بازهٔ سنی.
 * @param {object} data خروجی loadIntake()
 * @param {string} activeCode کد مسیر فعال
 */
export function pathwayCards(data, activeCode) {
  return `<div class="ip-pkgs" role="tablist" aria-label="انتخاب پکیج چکاپ">
    ${data.pathways
      .map(
        (p) => `<button class="ip-pkg${p.code === activeCode ? " is-on" : ""}" role="tab"
          aria-selected="${p.code === activeCode}" data-pkg="${esc2(p.code)}" type="button">
        <span class="ip-pkg__top">
          <span class="ip-pkg__g">${esc2(p.gender)}</span>
          <span class="ip-pkg__age">${esc2(p.ageLabel)}</span>
        </span>
        <b class="ip-pkg__t">${esc2(p.title)}</b>
        <span class="ip-pkg__n"><b>${esc2(p.questionCount)}</b> سوال</span>
        <span class="ip-pkg__m">${ic("clock")} ${esc2(p.minutes)} دقیقه · ${esc2(p.stationCount)} ایستگاه</span>
      </button>`
      )
      .join("")}
  </div>`;
}

/**
 * استپر بخش‌ها: هر بخش با تعداد سوال و نشان «شرطی».
 * @param {object} form فرم انتخاب‌شده
 * @param {number[]} perSection تعداد سوال هر بخش در بازهٔ سنی فعال
 * @param {string} formLabel برچسب فرم (مثلاً «فرم مردان»)
 */
export function sectionSteps(form, perSection, formLabel, ageRefLabel = "") {
  const total = perSection.reduce((a, b) => a + b, 0);
  return `<ol class="ip-steps">
    ${form.sections
      .map((s, i) => {
        const n = perSection[i] ?? s.questions;
        const hidden = n === 0;
        return `<li class="ip-step${hidden ? " is-skip" : ""}">
          <span class="ip-step__n">${esc2(String(i + 1).padStart(2, "0"))}</span>
          <div class="ip-step__body">
            <b class="ip-step__t">${esc2(s.title)}</b>
            ${s.hint ? `<span class="ip-step__hint">${esc2(s.hint)}</span>` : ""}
            <span class="ip-step__meta">
              <b>${esc2(n)}</b> سوال${s.conditional ? ` · <span class="ip-step__cond">${esc2(s.conditional)} شرطی</span>` : ""}
            </span>
          </div>
        </li>`;
      })
      .join("")}
    <li class="ip-step ip-step--total">
      <span class="ip-step__n">∑</span>
      <div class="ip-step__body">
        <b class="ip-step__t">جمع ${esc2(formLabel)}</b>
        <span class="ip-step__meta"><b>${esc2(total)}</b> سوال در ${esc2(form.sections.length)} بخش</span>
        <span class="ip-step__hint">بر اساس سن ${esc2(ageRefLabel)} — سوال‌های بالای ${esc2(50)} سال در پکیج ۴۰+ اضافه می‌شوند</span>
      </div>
    </li>
  </ol>`;
}

/** جدول فیلدهای یک بخش (برای حالت باز‌شو) */
export function sectionFields(section) {
  if (!section.fields?.length) return "";
  return `<ul class="ip-fields">
    ${section.fields
      .map(
        (f) => `<li>
        <span class="ip-fields__l">${esc2(f.label)}</span>
        <span class="ip-fields__t">${esc2(TYPE_FA[f.type] || f.type)}</span>
        ${f.required ? '<span class="ip-fields__req">الزامی</span>' : ""}
        ${f.prefilled ? '<span class="ip-fields__pre">از پرونده پر می‌شود</span>' : ""}
        ${f.ageMin ? `<span class="ip-fields__age">${esc2(f.ageMin)}+</span>` : ""}
      </li>`
      )
      .join("")}
  </ul>`;
}

/** نوار شواهد پرونده: همان خانه‌های «پروندهٔ پیش‌پذیرش» صفحهٔ اصلی، اما بر اساس داده واقعی */
export function evidenceRows(pathway) {
  const rows = [
    ["فرم پیش‌پذیرش", `${pathway.questionCount} سوال تکمیل‌شده`, "ok"],
    ["بخش‌ها", `${pathway.sectionCount} بخش — همه پاسخ‌داده‌شده`, "ok"],
    ["مدارک", "۴ فایل پیوست", "ok"],
    ["احراز حضور", "پیامک + تصویر + فاصله", "ok"],
    ["قفل پرونده", "بازبینی پزشک در انتظار", "warn"],
  ];
  return `<div class="ip-ev">
    ${rows.map(([l, v, s]) => `<div class="ip-ev__r"><span>${esc2(l)}</span><b class="is-${s}">${s === "ok" ? ic("check") : ic("clock")} ${esc2(v)}</b></div>`).join("")}
  </div>`;
}

/** قالب کامل بلوک */
export function intakeMarkup(data, opts = {}) {
  const active =
    data.pathways.find((p) => p.code === opts.pathway) ||
    data.pathways.find((p) => p.gender === "مرد" && p.minAge) ||
    data.pathways[0];
  const form = data.forms.find((f) => f.code === active.form);
  const perSection = active.sectionQuestions || form.sections.map((s) => s.questions);
  const formLabel = active.gender === "زن" ? "فرم بانوان" : "فرم آقایان";

  return `<div class="ip" data-intake data-active="${esc2(active.code)}" data-variant="${esc2(opts.variant || "full")}">
    <div class="ip__head">
      <div>
        <span class="ip__kicker">ساختار پرونده در سایت</span>
        <h3 class="ip__title">پروندهٔ پیش‌پذیرش، دقیقاً مثل فرم اصلی</h3>
        <p class="ip__lead">این جدول از کاتالوگ واقعی فرم خوانده شده: ${esc2(data.forms.length)} فرم،
          ${esc2(data.forms.reduce((a, f) => a + f.sectionCount, 0))} بخش و
          ${esc2(data.forms.reduce((a, f) => a + f.questionCount, 0))} سوال. برای هر پکیج، سوال‌های نامرتبط
          (مثل غربالگری پروستات زیر ۵۰ سال) از قبل حذف شده‌اند.</p>
      </div>
    </div>

    ${pathwayCards(data, active.code)}

    <div class="ip__grid">
      <div class="ip__col ip__col--steps">
        <div class="ip__colhead">
          <b>مسیر فرم · ${esc2(formLabel)}</b>
          <span class="ip__badge">${esc2(active.questionCount)} سوال برای این پکیج</span>
        </div>
        <div data-ip-steps>${sectionSteps(form, perSection, formLabel, esc2(active.ageRef))}</div>
        <p class="ip__foot">${ic("shield")} اگر برای یک بیمار هیچ سوالی در بخشی نماند، آن بخش از استپر حذف می‌شود — همان قاعدهٔ موتور فرم.</p>
      </div>

      <aside class="ip__col ip__col--ev">
        <div class="ip__colhead"><b>پروندهٔ آماده در پذیرش</b><span class="ip__live"><i></i> نمونه</span></div>
        <div data-ip-ev>${evidenceRows(active)}</div>
        <div class="ip__stations">
          <b>ایستگاه‌های چکاپ این پکیج</b>
          <ol>${active.stations.map((s) => `<li>${esc2(s.title)}${s.optional ? '<em>اختیاری</em>' : ""}</li>`).join("")}</ol>
        </div>
        <p class="ip__warn">${ic("lock")} ${esc2(form.warning.slice(0, 132))}…</p>
      </aside>
    </div>
  </div>`;
}

/** اتصال تعامل: کلیک روی پکیج‌ها بخش‌ها را عوض می‌کند */
export function bindIntake(root, data) {
  const box = root.querySelector("[data-intake]");
  if (!box) return;
  box.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-pkg]");
    if (!btn || !box.contains(btn)) return;
    const code = btn.dataset.pkg;
    const p = data.pathways.find((x) => x.code === code);
    if (!p) return;
    const form = data.forms.find((f) => f.code === p.form);
    const perSection = p.sectionQuestions || form.sections.map((s) => s.questions);
    const formLabel = p.gender === "زن" ? "فرم بانوان" : "فرم آقایان";

    box.dataset.active = code;
    box.querySelectorAll("[data-pkg]").forEach((b) => {
      const on = b.dataset.pkg === code;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-selected", String(on));
    });
    const steps = box.querySelector("[data-ip-steps]");
    if (steps) steps.innerHTML = sectionSteps(form, perSection, formLabel, p.ageRef);
    const ev = box.querySelector("[data-ip-ev]");
    if (ev) ev.innerHTML = evidenceRows(p);
    const badge = box.querySelector(".ip__badge");
    if (badge) badge.textContent = `${p.questionCount} سوال برای این پکیج`;
    const stations = box.querySelector(".ip__stations ol");
    if (stations)
      stations.innerHTML = p.stations.map((s) => `<li>${esc2(s.title)}${s.optional ? "<em>اختیاری</em>" : ""}</li>`).join("");
  });

  /* باز/بست کردن فهرست فیلدهای هر بخش */
  box.addEventListener("toggle", (e) => {
    const d = e.target;
    if (d instanceof HTMLDetailsElement && d.open && !d.dataset.filled) {
      const i = Number(d.dataset.sec);
      const p = data.pathways.find((x) => x.code === box.dataset.active);
      const form = p && data.forms.find((f) => f.code === p.form);
      const body = d.querySelector(".ip-sec__fields");
      if (body && form?.sections[i]) {
        body.innerHTML = sectionFields(form.sections[i]);
        d.dataset.filled = "1";
      }
    }
  }, true);
}
