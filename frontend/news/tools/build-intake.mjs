/*
 File: frontend/news/tools/build-intake.mjs
 Description: ساخت content/intake.json از کاتالوگ واقعی فرم پیش‌پذیرش + مسیرهای چکاپ
 Parent Dependencies: frontend/my/src/lib/form-catalog.seed.json, docs/شرط-نمایش-و-مخاطب-پرسشنامه.md
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

/** آیا این آیتم برای یک سن مشخص دیده می‌شود؟ (قوانین {field,op,value}) */
function visibleAtAge(item, age) {
  const rules = item.visibilityRules || [];
  for (const r of rules) {
    if (r.field === "age" && r.op === "gte" && age < Number(r.value)) return false;
    if (r.field === "age" && r.op === "lte" && age > Number(r.value)) return false;
  }
  return true;
}

function buildForm(form) {
  const sections = [...form.sections].sort((a, b) => a.sortOrder - b.sortOrder);
  const out = sections.map((s) => {
    const items = form.items.filter((i) => i.sectionId === s.id);
    return {
      title: s.title.replace(/\s+/g, " ").trim(),
      hint: (s.timeWindowHint || "").trim(),
      guide: (s.guideText || "").trim(),
      questions: items.length,
      conditional: items.filter((i) => (i.visibilityRules || []).length > 0).length,
      fields: items.map((i) => ({
        label: i.labelFa,
        type: i.inputType,
        required: !!i.required,
        prefilled: !!i.prefillFromPatient,
        options: (i.selectOptions || []).map((o) => o?.value ?? o).filter(Boolean),
        ageMin: (i.visibilityRules || []).find((r) => r.field === "age")?.value ?? null,
      })),
    };
  });

  const allAt = (age) => form.items.filter((i) => visibleAtAge(i, age)).length;
  return {
    code: form.code,
    title: form.title,
    gender: form.targetAudience.gender,
    ageMin: form.targetAudience.ageMin,
    ageMax: form.targetAudience.ageMax,
    warning: form.warningText,
    sectionCount: sections.length,
    questionCount: form.items.length,
    questionCountAt40: allAt(40),
    questionCountAt50: allAt(50),
    sections: out,
  };
}

/* مسیرهای چکاپ سازمانی — آینهٔ CorporatePathwayStationCatalog.cs */
const pathways = [
  {
    code: "CORP_MEN_LT40", title: "چکاپ آقایان زیر ۴۰ سال", gender: "مرد", minAge: null, maxAge: 39,
    minutes: 90, form: "cancer_screening_male_v02",
    description: "آزمایش، سونو، پذیرایی، نوار قلب، سپس پایش غیرحضوری پس از جواب آزمایش",
    stations: [["LAB","آزمایشگاه",false],["US_ABD","سونوگرافی شکم و لگن",false],["HOSP_MEAL","پذیرایی / صبحانه",true],["ECG","نوار قلب",false],["REMOTE_REVIEW","ویزیت غیرحضوری و بررسی پرونده",false]],
  },
  {
    code: "CORP_MEN_GE40", title: "چکاپ آقایان ۴۰ سال به بالا", gender: "مرد", minAge: 40, maxAge: null,
    minutes: 120, form: "cancer_screening_male_v02",
    description: "آزمایش، سونو، پذیرایی، نوار قلب، ویزیت قلب و اکو؛ تست ورزش در صورت صلاح‌دید",
    stations: [["LAB","آزمایشگاه",false],["US_ABD","سونوگرافی شکم و لگن",false],["HOSP_MEAL","پذیرایی / صبحانه",true],["ECG","نوار قلب",false],["CARDIO","ویزیت قلب و اکو",false],["STRESS","تست ورزش",true],["REMOTE_REVIEW","ویزیت غیرحضوری و بررسی پرونده",false]],
  },
  {
    code: "CORP_WOMEN_LT40", title: "چکاپ بانوان زیر ۴۰ سال", gender: "زن", minAge: null, maxAge: 39,
    minutes: 120, form: "cancer_screening_female_v02",
    description: "آزمایش، سونو شکم/لگن و برست، پذیرایی، نوار قلب، ویزیت زنان؛ پاپ در صورت نیاز",
    stations: [["LAB","آزمایشگاه",false],["US_ABD","سونوگرافی شکم و لگن",false],["US_BREAST","سونوگرافی پستان",false],["HOSP_MEAL","پذیرایی / صبحانه",true],["ECG","نوار قلب",false],["GYN","ویزیت متخصص زنان",false],["PAP","پاپ اسمیر",true],["REMOTE_REVIEW","ویزیت غیرحضوری و بررسی پرونده",false]],
  },
  {
    code: "CORP_WOMEN_GE40", title: "چکاپ بانوان ۴۰ سال به بالا", gender: "زن", minAge: 40, maxAge: null,
    minutes: 160, form: "cancer_screening_female_v02",
    description: "مسیر کامل بانوان ۴۰+ شامل برست، پذیرایی، قلب/اکو و زنان؛ تست ورزش و پاپ اختیاری",
    stations: [["LAB","آزمایشگاه",false],["US_ABD","سونوگرافی شکم و لگن",false],["US_BREAST","سونوگرافی پستان",false],["HOSP_MEAL","پذیرایی / صبحانه",true],["ECG","نوار قلب",false],["CARDIO","ویزیت قلب و اکو",false],["GYN","ویزیت متخصص زنان",false],["STRESS","تست ورزش",true],["PAP","پاپ اسمیر",true],["REMOTE_REVIEW","ویزیت غیرحضوری و بررسی پرونده",false]],
  },
];

const forms = catalog.forms.map(buildForm);
const byCode = Object.fromEntries(forms.map((f) => [f.code, f]));

const intake = {
  generatedFrom: [
    "frontend/my/src/lib/form-catalog.seed.json",
    "backend/src/Nabz.Application/Identity/CorporatePathwayStationCatalog.cs",
  ],
  note: "این فایل ساختهٔ tools/build-intake.mjs است؛ دستی ویرایش نکنید.",
  sourceVersion: catalog.schemaVersion,
  forms,
  pathways: pathways.map((p) => {
    const f = byCode[p.form];
    const formDef = catalog.forms.find((x) => x.code === p.form);
    // نمایندهٔ سنی هر پکیج: کف بازه، یا ۳۵ برای «زیر ۴۰»
    const ageRef = p.minAge ?? 35;
    const questions = formDef.items.filter((i) => visibleAtAge(i, ageRef)).length;
    return {
      ...p,
      ageLabel: p.minAge ? `${fa(p.minAge)}+` : `زیر ${fa(Number(p.maxAge) + 1)}`,
      ageRefLabel: fa(ageRef),
      questionCount: questions,
      questionCountAt50: formDef.items.filter((i) => visibleAtAge(i, 50)).length,
      /* تعداد سوال هر بخش در همان سن نمایندهٔ پکیج — باید با questionCount جمع بزند */
      sectionQuestions: f.sections.map((sec, i) => {
        const items = formDef.items.filter((x) => x.sectionId === formDef.sections[i].id);
        return items.filter((x) => visibleAtAge(x, ageRef)).length;
      }),
      sectionQuestionsAt50: f.sections.map((sec, i) => {
        const items = formDef.items.filter((x) => x.sectionId === formDef.sections[i].id);
        return items.filter((x) => visibleAtAge(x, 50)).length;
      }),
      ageRef,
      sectionCount: f.sectionCount,
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

const outPath = resolve(root, "content/intake.json");
writeFileSync(outPath, JSON.stringify({ intake: faNum(intake) }, null, 2) + "\n", "utf8");

/* گزارش کنسول برای بررسی */
for (const f of forms) {
  console.log(`${f.code}: ${fa(f.sectionCount)} بخش، ${fa(f.questionCount)} سوال (۴۰+: ${fa(f.questionCountAt40)}، ۵۰+: ${fa(f.questionCountAt50)})`);
}
for (const p of intake.pathways) {
  console.log(`${p.code}: ${p.title} — ${fa(p.questionCount)} سوال، ${fa(p.stationCount)} ایستگاه، ${fa(p.minutes)} دقیقه`);
}
console.log(`\nنوشته شد: ${outPath}`);
