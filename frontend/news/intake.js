/*
 File: frontend/news/intake.js
 Description: پیش‌نمایش تعاملی پروندهٔ پیش‌پذیرش — عیناً مثل فرم واقعی اپ (استپر بخش‌ها + سوال‌ها)
 Parent Dependencies: content/intake.json, styles.css (.pf-*)

 استفاده:
   intakeMarkup(D.intake, { pathway: "CORP_MEN_GE40" })   → HTML
   bindIntake(root, D.intake)                             → تعامل
*/

let INTAKE_CACHE = null;

export async function loadIntake() {
  if (INTAKE_CACHE) return INTAKE_CACHE;
  const res = await fetch("content/intake.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`intake.json: ${res.status}`);
  INTAKE_CACHE = (await res.json()).intake;
  return INTAKE_CACHE;
}

const esc2 = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const I = {
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  shield: '<path d="M12 3l7.5 3v6c0 4.5-3 8.2-7.5 9.5C7.5 20.2 4.5 16.5 4.5 12V6L12 3Z"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  warn: '<path d="M12 4 2.8 20h18.4L12 4Z"/><path d="M12 10v4M12 17h.01"/>',
  file: '<path d="M13.5 3.5H7A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V9.5l-6-6Z"/><path d="M13 3.8V10h6"/>',
  right: '<path d="m14 6 6 6-6 6"/><path d="M20 12H4"/>',
  left: '<path d="m10 6-6 6 6 6"/><path d="M4 12h16"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
};
const ic = (n, cls = "") =>
  `<svg class="pf-ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ""}</svg>`;

/* ── یک فیلد، دقیقاً مثل اپ ── */
function fieldHtml(f, idx) {
  const label = `<label class="pf-q__l" for="pf-${idx}">${esc2(f.label)}${
    f.required ? '<span class="pf-q__req" title="الزامی">*</span>' : ""
  }</label>`;
  const id = `pf-${idx}`;
  switch (f.type) {
    case "yn":
      return `<div class="pf-q pf-q--yn">
        <label class="pf-q__l">${esc2(f.label)}${f.required ? '<span class="pf-q__req">*</span>' : ""}</label>
        <div class="pf-yn" role="group" aria-label="${esc2(f.label)}" data-q="${idx}">
          <button type="button" class="pf-yn__b" data-yn="yes">بله</button>
          <button type="button" class="pf-yn__b" data-yn="no">خیر</button>
          <button type="button" class="pf-yn__b" data-yn="unknown">نمی‌دانم</button>
        </div>
      </div>`;
    case "select":
      return `<div class="pf-q">
        ${label}
        <select class="pf-in" id="${id}">
          <option value="">انتخاب کنید…</option>
          ${f.options.map((o) => `<option>${esc2(o)}</option>`).join("")}
        </select>
      </div>`;
    case "date":
      return `<div class="pf-q">
        ${label}
        <input class="pf-in" id="${id}" type="text" inputmode="numeric" placeholder="۱۳۶۰/۰۵/۱۲" aria-label="${esc2(f.label)}">
      </div>`;
    case "number":
      return `<div class="pf-q">
        ${label}
        <input class="pf-in pf-in--num" id="${id}" type="text" inputmode="numeric" placeholder="—">
      </div>`;
    default:
      return `<div class="pf-q">
        ${label}
        <input class="pf-in" id="${id}" type="text" placeholder="${
          f.prefilled ? "از پرونده خوانده می‌شود" : "پاسخ شما"
        }" ${f.prefilled ? "readonly" : ""}>
      </div>`;
  }
}

/** کارت‌های پکیج (بالای پیش‌نمایش) */
export function pathwayCards(data, activeCode) {
  return `<div class="pf-pkgs" role="tablist" aria-label="انتخاب پکیج چکاپ">
    ${data.pathways
      .map(
        (p) => `<button class="pf-pkg${p.code === activeCode ? " is-on" : ""}" role="tab" type="button"
          aria-selected="${p.code === activeCode}" data-pkg="${esc2(p.code)}">
        <span class="pf-pkg__row">
          <span class="pf-pkg__g">${esc2(p.gender)}</span>
          <span class="pf-pkg__age">${esc2(p.ageLabel)}</span>
        </span>
        <b>${esc2(p.title)}</b>
        <span class="pf-pkg__n"><b>${esc2(p.questionCount)}</b> سوال · ${esc2(p.sectionCount)} بخش</span>
      </button>`
      )
      .join("")}
  </div>`;
}

/** استپر افقی بخش‌ها — مثل نوار چیپ‌های اپ */
function stepperHtml(form, activeIdx) {
  return `<div class="pf-stepper" role="tablist" aria-label="بخش‌های پرسشنامه">
    ${form.sections
      .map((s, i) => {
        const n = form.sections[i].questions;
        return `<button type="button" role="tab" class="pf-step${i === activeIdx ? " is-on" : ""}"
          aria-selected="${i === activeIdx}" data-sec="${i}" title="${esc2(s.title)}">
          <span class="pf-step__n">${esc2(String(i + 1).padStart(2, "0"))}</span>
          <span class="pf-step__t">${esc2(s.title.length > 24 ? s.title.slice(0, 24) + "…" : s.title)}</span>
          <span class="pf-step__c">${esc2(String(n))}</span>
        </button>`;
      })
      .join("")}
  </div>`;
}

/** بدنهٔ یک بخش: عنوان + راهنما + فیلدها */
function sectionBodyHtml(form, secIdx, ageKey) {
  const s = form.sections[secIdx];
  const fields = s.fieldsAt?.[String(ageKey)] || s.fieldsAt?.[ageKey] || [];
  return `<div class="pf-body__head">
      <h4>${esc2(s.title)}</h4>
      ${s.guide ? `<p class="pf-body__guide">${esc2(s.guide)}</p>` : ""}
      <p class="pf-body__meta">
        ${s.hint ? `<span class="pf-chip">${esc2(s.hint)}</span>` : ""}
        <span>${esc2(String(fields.length))} سوال${s.conditional ? ` · ${esc2(String(s.conditional))} شرطی` : ""}</span>
      </p>
    </div>
    <div class="pf-fields">${
      fields.length
        ? fields.map((f, i) => fieldHtml(f, secIdx * 100 + i)).join("")
        : `<p class="pf-empty">با توجه به سن و وضعیت تاهل، در این بخش سوالی برای این بیمار نمایش داده نمی‌شود — و بخش از استپر حذف می‌شود.</p>`
    }</div>`;
}

/** اسکلت کامل بلوک */
export function intakeMarkup(data, opts = {}) {
  const active =
    data.pathways.find((p) => p.code === opts.pathway) ||
    data.pathways.find((p) => p.gender === "مرد" && p.minAge) ||
    data.pathways[0];
  const form = data.forms.find((f) => f.code === active.form);
  const ageKey = active.ageRefKey || 40;
  const total = form.sections.reduce((a, s) => a + s.questions, 0);

  return `<div class="pf" data-intake data-active="${esc2(active.code)}" data-age="${esc2(String(ageKey))}"
       data-cur="0" data-form="${esc2(form.code)}">
    <div class="pf__head">
      <div>
        <span class="pf__kicker">پیش‌نمایش واقعی فرم</span>
        <h3 class="pf__title">پرسشنامهٔ پیش‌پذیرش را همان‌جا ببینید که بیمار می‌بیند</h3>
        <p class="pf__lead">همان بخش‌بندی، همان ترتیب سوال‌ها و همان دکمه‌های «بله / خیر / نمی‌دانم».
          ${esc2(String(form.questionCount))} سوال قابل‌نمایش در ${esc2(String(form.sectionCount))} بخش؛
          بخش‌های نامرتبط با سن، از استپر حذف می‌شوند.</p>
      </div>
      <span class="pf__device">${ic("phone")} موبایل · ${esc2(form.gender)}</span>
    </div>

    ${pathwayCards(data, active.code)}

    <div class="pf-stage">
      <div class="pf-phone">
        <div class="pf-phone__bar"><i></i><i></i><i></i><span></span></div>

        <div class="pf-app">
          <div class="pf-app__top">
            <div class="pf-app__t">
              <b>${esc2(form.title)}</b>
              <span>نسخه ${esc2("۲")} · ${esc2(form.gender)} · <span data-pf-progress>۰ از ${esc2(String(total))}</span></span>
            </div>
            <span class="pf-app__status">در انتظار تکمیل</span>
          </div>

          <div class="pf-app__track"><span data-pf-bar style="width:0%"></span></div>

          <details class="pf-app__warn">
            <summary>${ic("warn")} <span>نکته ایمنی — جایگزین معاینه پزشک نیست</span></summary>
            <p>${esc2(form.warning)}</p>
          </details>

          <div data-pf-stepper>${stepperHtml(form, 0)}</div>

          <div class="pf-body" data-pf-body>${sectionBodyHtml(form, 0, ageKey)}</div>

          <div class="pf-nav">
            <button type="button" class="pf-nav__b pf-nav__b--ghost" data-pf-prev disabled>${ic("right")} بخش قبل</button>
            <button type="button" class="pf-nav__b pf-nav__b--p" data-pf-next>بخش بعد ${ic("left")}</button>
          </div>
        </div>
      </div>

      <aside class="pf-side">
        <div class="pf-side__card">
          <div class="pf-side__h"><b>مسیر این پکیج</b><span class="pf-live"><i></i> نمونه</span></div>
          <ol class="pf-stations" data-pf-stations>
            ${active.stations
              .map((s) => `<li>${esc2(s.title)}${s.optional ? "<em>اختیاری</em>" : ""}</li>`)
              .join("")}
          </ol>
          <div class="pf-side__sum">
            <div><b>${esc2(String(active.questionCount))}</b><span>سوال</span></div>
            <div><b>${esc2(String(active.sectionCount))}</b><span>بخش</span></div>
            <div><b>${esc2(String(active.stationCount))}</b><span>ایستگاه</span></div>
            <div><b>${esc2(String(active.minutes))}</b><span>دقیقه</span></div>
          </div>
        </div>

        <div class="pf-side__note">
          ${ic("lock")}
          <p><b>مرز محصول:</b> این پرسشنامه پروندهٔ بالینی رسمی تولید نمی‌کند و جایگزین HIS نیست؛
          ورودی‌های پیش‌پذیرش را ساختاریافته تحویل می‌دهد.</p>
        </div>
      </aside>
    </div>

    <p class="pf__foot">${ic("shield")} هر پاسخی که در این پیش‌نمایش می‌زنید فقط در مرورگر خودتان می‌ماند —
      هیچ داده‌ای ارسال یا ذخیره نمی‌شود.</p>
  </div>`;
}

/** تعامل: پکیج، استپر، سوال‌های بله/خیر، ناوبری، نوار پیشرفت */
export function bindIntake(root, data) {
  const box = root.querySelector("[data-intake]");
  if (!box) return;

  const state = {
    code: box.dataset.active,
    ageKey: Number(box.dataset.age) || 40,
    sec: 0,
    /* کلید بخش:شماره‌گروه → مقدار انتخاب‌شده؛ با رفتن به بخش دیگر هم می‌ماند */
    answered: new Map(),
  };

  const formOf = (code) => {
    const p = data.pathways.find((x) => x.code === code);
    return { p, form: p && data.forms.find((f) => f.code === p.form) };
  };

  const totalOf = (form) => form.sections.reduce((a, s) => a + s.questions, 0);

  const refreshProgress = () => {
    const { form } = formOf(state.code);
    if (!form) return;
    const total = totalOf(form);
    const done = Math.min(state.answered.size, total);
    const pct = total ? Math.round((done / total) * 100) : 0;
    const lbl = box.querySelector("[data-pf-progress]");
    const bar = box.querySelector("[data-pf-bar]");
    const nf = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
    if (lbl) lbl.innerHTML = `${nf(done)} از ${nf(total)}`;
    if (bar) bar.style.width = `${pct}%`;
  };

  const renderSection = () => {
    const { form } = formOf(state.code);
    if (!form) return;
    const body = box.querySelector("[data-pf-body]");
    const stepper = box.querySelector("[data-pf-stepper]");
    if (body) {
      body.innerHTML = sectionBodyHtml(form, state.sec, state.ageKey);
      /* پاسخ‌هایی که کاربر قبلاً در همین بخش داده، برگردانده می‌شود */
      body.querySelectorAll(".pf-yn[data-q]").forEach((g) => {
        const v = state.answered.get(`${state.sec}:${g.dataset.q}`);
        if (!v) return;
        const b = g.querySelector(`[data-yn="${v}"]`);
        if (b) b.classList.add("is-on", v === "yes" ? "is-yes" : v === "no" ? "is-no" : "is-unk");
      });
    }
    if (stepper) stepper.innerHTML = stepperHtml(form, state.sec);
    const prev = box.querySelector("[data-pf-prev]");
    const next = box.querySelector("[data-pf-next]");
    if (prev) prev.disabled = state.sec === 0;
    if (next) next.disabled = state.sec >= form.sections.length - 1;
    box.dataset.cur = String(state.sec);
    /* چیپ فعال همیشه در قاب دیده شود — RTL، پس از scrollIntoView استفاده می‌کنیم */
    const on = stepper?.querySelector(".pf-step.is-on");
    if (on) {
      const a = on.getBoundingClientRect();
      const b = stepper.getBoundingClientRect();
      if (a.left < b.left + 6 || a.right > b.right - 6) {
        on.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      }
    }
  };

  const renderPathway = () => {
    const { p, form } = formOf(state.code);
    if (!p || !form) return;
    box.querySelectorAll("[data-pkg]").forEach((b) => {
      const on = b.dataset.pkg === state.code;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-selected", String(on));
    });
    const st = box.querySelector("[data-pf-stations]");
    if (st)
      st.innerHTML = p.stations
        .map((s) => `<li>${esc2(s.title)}${s.optional ? "<em>اختیاری</em>" : ""}</li>`)
        .join("");
    const sum = box.querySelector(".pf-side__sum");
    const nf = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
    if (sum)
      sum.innerHTML = `<div><b>${nf(p.questionCount)}</b><span>سوال</span></div>
        <div><b>${nf(p.sectionCount)}</b><span>بخش</span></div>
        <div><b>${nf(p.stationCount)}</b><span>ایستگاه</span></div>
        <div><b>${nf(p.minutes)}</b><span>دقیقه</span></div>`;
    state.ageKey = p.ageRefKey || 40;
    box.dataset.age = String(state.ageKey);
    box.dataset.active = p.code;
    const dev = box.querySelector(".pf__device");
    if (dev) dev.innerHTML = `${ic("phone")} موبایل · ${esc2(form.gender)}`;
  };

  box.addEventListener("click", (e) => {
    const pkg = e.target.closest("[data-pkg]");
    if (pkg && box.contains(pkg)) {
      state.code = pkg.dataset.pkg;
      state.sec = 0;
      state.answered.clear();
      renderPathway();
      renderSection();
      refreshProgress();
      return;
    }

    /* فقط چیپ استپر — نه هر عنصری که data-sec دارد */
    const step = e.target.closest(".pf-step[data-sec]");
    if (step && box.contains(step)) {
      state.sec = Number(step.dataset.sec) || 0;
      renderSection();
      return;
    }

    if (e.target.closest("[data-pf-next]")) {
      const { form } = formOf(state.code);
      if (form && state.sec < form.sections.length - 1) {
        state.sec += 1;
        renderSection();
      }
      return;
    }
    if (e.target.closest("[data-pf-prev]")) {
      if (state.sec > 0) {
        state.sec -= 1;
        renderSection();
      }
      return;
    }

    /* دکمه‌های بله / خیر / نمی‌دانم */
    const yn = e.target.closest("[data-yn]");
    if (yn && box.contains(yn)) {
      const group = yn.parentElement;
      group.querySelectorAll("[data-yn]").forEach((b) => b.classList.remove("is-on", "is-yes", "is-no", "is-unk"));
      yn.classList.add("is-on", yn.dataset.yn === "yes" ? "is-yes" : yn.dataset.yn === "no" ? "is-no" : "is-unk");
      const key = `${state.sec}:${group.dataset.q}`;
      state.answered.set(key, yn.dataset.yn);
      refreshProgress();
    }
  });

  refreshProgress();
}
