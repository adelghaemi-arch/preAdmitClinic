/*
 File: frontend/news/tools/build-intake.mjs
 Description: ساخت content/intake.json از کاتالوگ واقعی فرم پیش‌پذیرش + مسیرهای چکاپ
 Parent Dependencies: frontend/my/src/lib/form-catalog.seed.json, backend/.../CorporatePathwayStationCatalog.cs
 Usage: node tools/build-intake.mjs
*/
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");              // frontend/news
const repo = resolve(root, "../..");           // repo root

const catalog = JSON.parse(
  readFileSync(resolve(repo, "frontend/my/src/lib/form-catalog.seed.json"), "utf8")
);

const FA = "۰۱۲۳۴۵۶۷۸۹";
const fa = (n) => String(n).replace(/\d/g, (d) => FA[+d]);

/* ── همان قواعد form-engine.ts ───────────────────────────────────────────
   آیتم‌هایی که در UI بیمار دیده نمی‌شوند باید از شمارش هم بیرون بروند،
   وگرنه سایت عددی بزرگ‌تر از خود اپ نشان می‌دهد. */
function isFormDateItem(item) {
  return item.inputType === "date" && item.code.endsWith("formDate");
}
function isProfileIdentityItem(item) {
  if (["fullName", "nationalId", "phone"].includes(item.prefillFromPatient)) return true;
  return /(_BASE|_DEMO)_(fullName|nationalId|phone)$/i.test(item.code);
}
function isUserFacing(item) {
  if (item.code.includes("_SIG_")) return false;
  if (isFormDateItem(item)) return false;
  if (isProfileIdentityItem(item)) return false;
  return true;
}

/** آیا این آیتم در این سن دیده می‌شود؟ (قواعد {field,op,value}) */
function visibleAtAge(item, age) {
  for (const r of item.visibilityRules || []) {
    if (r.field === "age" && r.op === "gte" && age < Number(r.value)) return false;
    if (r.field === "age" && r.op === "lte" && age > Number(r.value)) return false;
  }
  return true;
}

/* نوع فیلد را به همان کنترلی تبدیل می‌کند که اپ نشان می‌دهد */
function controlOf(item) {
  if (item.inputType === "yn_unk") return "yn";
  if (item.inputType === "select") return "select";
  if (item.inputType === "date") return "date";
  if (item.inputType === "number") return "number";
  return "text";
}

function buildForm(form) {
  const sections = [...form.sections].sort((a, b) => a.sortOrder - b.sortOrder);

  const fieldsOf = (sectionId, age) =>
    form.items
      .filter((i) => i.sectionId === sectionId && isUserFacing(i) && visibleAtAge(i, age))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => ({
        label: i.labelFa,
        type: controlOf(i),
        required: !!i.required,
        prefilled: !!i.prefillFromPatient,
        options: (i.selectOptions || []).map((o) => o?.value ?? o).filter(Boolean),
        ageMin: (i.visibilityRules || []).find((r) => r.field === "age")?.value ?? null,
      }));

  const facing = form.items.filter(isUserFacing);
  const countAt = (age) => facing.filter((i) => visibleAtAge(i, age)).length;

  return {
    code: form.code,
    /* عنوان نمایشی همان چیزی که اپ نشان می‌دهد */
    title: /غربالگری و واکسیناسیون/.test(form.title) ? "پرسشنامه پیش‌پذیرش" : form.title,
    gender: form.targetAudience.gender,
    ageMin: form.targetAudience.ageMin,
    ageMax: form.targetAudience.ageMax,
    warning: form.warningText,
    sectionCount: sections.length,
    questionCount: facing.length,
    questionCountAt40: countAt(40),
    questionCountAt50: countAt(50),
    /* همراه هر بخش، فیلدهای واقعی در همان سن — برای پیش‌نمایش تعاملی */
    sections: sections.map((s) => ({
      title: s.title.replace(/\s+/g, " ").trim(),
      hint: (s.timeWindowHint || "").trim(),
      guide: (s.guideText || "").trim(),
      questions: form.items.filter((i) => i.sectionId === s.id && isUserFacing(i)).length,
      conditional: form.items.filter(
        (i) => i.sectionId === s.id && isUserFacing(i) && (i.visibilityRules || []).length > 0
      ).length,
      fieldsAt: {
        35: fieldsOf(s.id, 35),
        40: fieldsOf(s.id, 40),
        50: fieldsOf(s.id, 50),
      },
    })),
  };
}

/* ── مسیرهای چکاپ سازمانی: آینهٔ CorporatePathwayStationCatalog.cs ── */
const pathways = [
  {
    code: "CORP_MEN_LT40", title: "چکاپ آقایان زیر ۴۰ سال", gender: "مرد", minAge: null, maxAge: 39,
    minutes: 90, form: "cancer_screening_male_v02",
    stations: [["LAB","آزمایشگاه",false],["US_ABD","سونوگرافی شکم و لگن",false],["HOSP_MEAL","پذیرایی / صبحانه",true],["ECG","نوار قلب",false],["REMOTE_REVIEW","ویزیت غیرحضوری و بررسی پرونده",false]],
  },
  {
    code: "CORP_MEN_GE40", title: "چکاپ آقایان ۴۰ سال به بالا", gender: "مرد", minAge: 40, maxAge: null,
    minutes: 120, form: "cancer_screening_male_v02",
    stations: [["LAB","آزمایشگاه",false],["US_ABD","سونوگرافی شکم و لگن",false],["HOSP_MEAL","پذیرایی / صبحانه",true],["ECG","نوار قلب",false],["CARDIO","ویزیت قلب و اکو",false],["STRESS","تست ورزش",true],["REMOTE_REVIEW","ویزیت غیرحضوری و بررسی پرونده",false]],
  },
  {
    code: "CORP_WOMEN_LT40", title: "چکاپ بانوان زیر ۴۰ سال", gender: "زن", minAge: null, maxAge: 39,
    minutes: 120, form: "cancer_screening_female_v02",
    stations: [["LAB","آزمایشگاه",false],["US_ABD","سونوگرافی شکم و لگن",false],["US_BREAST","سونوگرافی پستان",false],["HOSP_MEAL","پذیرایی / صبحانه",true],["ECG","نوار قلب",false],["GYN","ویزیت متخصص زنان",false],["PAP","پاپ اسمیر",true],["REMOTE_REVIEW","ویزیت غیرحضوری و بررسی پرونده",false]],
  },
  {
    code: "CORP_WOMEN_GE40", title: "چکاپ بانوان ۴۰ سال به بالا", gender: "زن", minAge: 40, maxAge: null,
    minutes: 160, form: "cancer_screening_female_v02",
    stations: [["LAB","آزمایشگاه",false],["US_ABD","سونوگرافی شکم و لگن",false],["US_BREAST","سونوگرافی پستان",false],["HOSP_MEAL","پذیرایی / صبحانه",true],["ECG","نوار قلب",false],["CARDIO","ویزیت قلب و اکو",false],["GYN","ویزیت متخصص زنان",false],["STRESS","تست ورزش",true],["PAP","پاپ اسمیر",true],["REMOTE_REVIEW","ویزیت غیرحضوری و بررسی پرونده",false]],
  },
];

const forms = catalog.forms.map(buildForm);
const byCode = Object.fromEntries(forms.map((f) => [f.code, f]));

const intake = {
  generatedFrom: [
    "frontend/my/src/lib/form-catalog.seed.json",
    "frontend/my/src/lib/form-engine.ts (isUserFacingFormItem)",
    "backend/src/Nabz.Application/Identity/CorporatePathwayStationCatalog.cs",
  ],
  note: "ساختهٔ tools/build-intake.mjs — دستی ویرایش نکنید.",
  sourceVersion: catalog.schemaVersion,
  forms,
  pathways: pathways.map((p) => {
    const formDef = catalog.forms.find((x) => x.code === p.form);
    const facing = formDef.items.filter(isUserFacing);
    /* سن نمایندهٔ پکیج: کف بازه، یا ۳۵ برای «زیر ۴۰» */
    const ageRef = p.minAge ?? 35;
    const refKey = ageRef >= 50 ? 50 : ageRef >= 40 ? 40 : 35;
    return {
      ...p,
      ageRef,
      ageRefKey: refKey,
      ageRefLabel: fa(ageRef),
      ageLabel: p.minAge ? `${fa(p.minAge)}+` : `زیر ${fa(Number(p.maxAge) + 1)}`,
      questionCount: facing.filter((i) => visibleAtAge(i, ageRef)).length,
      questionCountAt50: facing.filter((i) => visibleAtAge(i, 50)).length,
      sectionQuestions: forms
        .find((f) => f.code === p.form)
        .sections.map((_, idx) => {
          const items = formDef.items.filter((x) => x.sectionId === formDef.sections[idx].id && isUserFacing(x));
          return items.filter((x) => visibleAtAge(x, ageRef)).length;
        }),
      sectionCount: forms.find((f) => f.code === p.form).sectionCount,
      stations: p.stations.map(([code, title, optional], i) => ({ code, title, step: i + 1, optional })),
      stationCount: p.stations.length,
    };
  }),
};

/* اعداد فارسی برای نمایش */
const faNum = (o) => {
  if (Array.isArray(o)) return o.map(faNum);
  if (o && typeof o === "object") return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, faNum(v)]));
  return o;
};

/* کلیدهای سنی «fieldsAt» نباید فارسی شوند — با رشته مقایسه می‌شوند */
const keepKeys = new Set(["fieldsAt", "35", "40", "50"]);

const outPath = resolve(root, "content/intake.json");
writeFileSync(outPath, JSON.stringify({ intake: faNum(intake) }, null, 2) + "\n", "utf8");

for (const f of forms) {
  console.log(`${f.code}: ${fa(f.sectionCount)} بخش، ${fa(f.questionCount)} سوال قابل‌نمایش (۴۰+: ${fa(f.questionCountAt40)}، ۵۰+: ${fa(f.questionCountAt50)})`);
}
for (const p of intake.pathways) {
  console.log(`${p.code}: ${p.title} — ${fa(p.questionCount)} سوال، ${fa(p.stationCount)} ایستگاه (سن مبنا ${fa(p.ageRef)})`);
}
console.log(`\nنوشته شد: ${outPath}`);
