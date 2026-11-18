# -*- coding: utf-8 -*-
"""Build FormCatalog seed JSON from extracted questionnaire text."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
OUT = ROOT / "frontend" / "src" / "lib" / "form-catalog.seed.json"
CODING_MAP = ROOT / "scripts" / "form-item-coding-map.json"
UMLS_CUI = re.compile(r"^C\d{7}$")

DIGIT_MAP = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")
SEC_PAT = re.compile(r"^بخش\s*([۰-۹0-9]+)\)?\s*(.+)$")
SKIP = {
    "ردیف",
    "سؤال",
    "بله",
    "خیر",
    "نمی‌دانم/نامشخص",
    "توضیحات/مدت/تاریخ",
    "توضیحات (مدت/تاریخ/شدت)",
    "□",
}


def load_extracted(kind: str) -> str:
    files = list(DOCS.glob("*.extracted.txt"))
    if kind == "female":
        for f in files:
            if "بانوان" in f.name:
                return f.read_text(encoding="utf-8")
    for f in files:
        if "بانوان" not in f.name:
            return f.read_text(encoding="utf-8")
    raise SystemExit("extracted texts not found")


def parse_structure(text: str):
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    sections = []
    questions = []
    current_sec = None
    sec_order = 0
    i = 0
    while i < len(lines):
        ln = lines[i]
        m = SEC_PAT.match(ln)
        if m:
            sec_order += 1
            title = m.group(2).strip()
            sections.append({"order": sec_order, "title": title})
            current_sec = sec_order
            i += 1
            continue
        if re.fullmatch(r"[0-9۰-۹]+", ln):
            num = int(ln.translate(DIGIT_MAP))
            j = i + 1
            while j < len(lines) and lines[j] in SKIP:
                j += 1
            if j < len(lines) and not re.fullmatch(r"[0-9۰-۹]+", lines[j]) and not SEC_PAT.match(lines[j]):
                qtext = lines[j]
                rules = []
                if any(x in qtext for x in ("متاهل", "متأهل", "ازدواج")):
                    rules.append({"field": "maritalStatus", "op": "in", "value": ["متأهل", "ازدواج‌کرده"]})
                if any(x in qtext for x in ("بالاي 50", "بالای ۵۰", "بالاي ۵۰", "افراد بالاي", "افراد بالای")):
                    rules.append({"field": "age", "op": "gte", "value": 50})
                questions.append(
                    {
                        "num": num,
                        "label": qtext,
                        "sectionOrder": current_sec or 1,
                        "visibilityRules": rules,
                    }
                )
                i = j + 1
                continue
        i += 1
    return sections, questions


def concept_kind(label: str, section_title: str) -> str:
    blob = f"{section_title} {label}"
    if any(x in blob for x in ("غربالگری", "پاپ", "مامو", "PSA", "کولونوسکوپی", "واکسن", "MRI", "سونو")):
        return "screening"
    if any(x in blob for x in ("خانواد", "ژنتیک", "BRCA", "Lynch", "LYNCH")):
        return "family"
    if any(x in blob for x in ("سبک زندگی", "سیگار", "قلیان", "الکل", "فعالیت", "رژیم", "مواجهه", "آفتاب")):
        return "lifestyle"
    if any(x in blob for x in ("آگاهی", "مراجعه", "تعویق", "انصراف", "خودآزمایی")):
        return "behavior"
    if any(x in blob for x in ("سابقه", "دیابت", "هپاتیت", "پرتو", "شیمی", "پیوند", "IBD", "HIV", "HPV", "بیوپسی")):
        return "history"
    return "symptom"


def ai_tags(label: str, gender: str) -> list[str]:
    tags = [gender]
    mapping = [
        ("پروستات", "prostate"),
        ("ادرار", "urinary"),
        ("بیضه", "testis"),
        ("پستان", "breast"),
        ("تخمدان", "ovary"),
        ("رحم", "uterus"),
        ("دهانه", "cervix"),
        ("HPV", "hpv"),
        ("پاپ", "pap"),
        ("روده", "colorectal"),
        ("مدفوع", "colorectal"),
        ("ریه", "lung"),
        ("سرفه", "lung"),
        ("سیگار", "tobacco"),
        ("قلیان", "tobacco"),
        ("الکل", "alcohol"),
        ("BRCA", "genetics"),
        ("Lynch", "genetics"),
        ("LYNCH", "genetics"),
        ("کاهش وزن", "red_flag"),
        ("خون", "red_flag"),
        ("توده", "red_flag"),
        ("تعریق", "red_flag"),
        ("خانواد", "family_hx"),
        ("غربال", "screening"),
        ("مامو", "screening"),
        ("PSA", "screening"),
    ]
    for needle, tag in mapping:
        if needle in label and tag not in tags:
            tags.append(tag)
    return tags


def demographic_items(prefix: str, form_id: str, section_id: str):
    specs = [
        ("fullName", "نام و نام خانوادگی", "text", True, True),
        ("nationalId", "کدملی", "text", True, True),
        ("birthDate", "تاریخ تولد", "date", False, False),
        ("formDate", "تاریخ تکمیل پرسشنامه", "date", False, False),
        ("heightCm", "قد (سانتی‌متر)", "number", False, False),
        ("weightKg", "وزن (کیلوگرم)", "number", False, False),
        ("waistCm", "دور کمر (سانتی‌متر)", "number", False, False),
        ("phone", "شماره تماس", "text", True, True),
        ("city", "شهر محل سکونت", "province_city", False, False),
        ("maritalStatus", "وضعیت تاهل", "select", False, False),
    ]
    items = []
    for i, (code, label, itype, prefill, readonly) in enumerate(specs, start=1):
        item = {
            "id": f"{prefix}_BASE_{i}",
            "sectionId": section_id,
            "code": f"{prefix}_BASE_{code}",
            "labelFa": label,
            "inputType": itype,
            "required": True,
            "sortOrder": i,
            "visibilityRules": [],
            "helpText": "",
            "notesPolicy": "never",
            "prefillFromPatient": code if prefill else None,
            "readOnlyIfPrefill": readonly,
            "selectOptions": ["مجرد", "متأهل", "ازدواج‌کرده", "سایر"] if code == "maritalStatus" else None,
            "coding": {
                "snomed": [],
                "loinc": [],
                "icd10": [],
                "umls": [],
                "conceptKind": "demographics",
                "aiTags": ["demographics", code],
                "redFlagOnYes": False,
            },
        }
        items.append(item)
    return items


def load_coding_map() -> dict:
    if not CODING_MAP.exists():
        raise SystemExit(f"coding map missing: {CODING_MAP}")
    return json.loads(CODING_MAP.read_text(encoding="utf-8"))


def apply_coding_map(form: dict, coding_map: dict) -> None:
    for item in form["items"]:
        code = item["code"]
        mapped = coding_map.get(code)
        if not mapped:
            raise SystemExit(f"no coding map entry for {code}")
        item["coding"]["snomed"] = list(mapped.get("snomed") or [])
        item["coding"]["loinc"] = list(mapped.get("loinc") or [])
        item["coding"]["icd10"] = list(mapped.get("icd10") or [])
        item["coding"]["umls"] = list(mapped.get("umls") or [])
        validate_item_coding(code, item["coding"])


def validate_item_coding(code: str, coding: dict) -> None:
    umls = coding.get("umls") or []
    if not umls:
        raise SystemExit(f"{code}: umls required")
    for cui in umls:
        if not UMLS_CUI.match(str(cui)):
            raise SystemExit(f"{code}: invalid umls CUI {cui}")
    if not (coding.get("snomed") or coding.get("loinc") or coding.get("icd10")):
        raise SystemExit(f"{code}: at least one of snomed/loinc/icd10 required")


def build_form(form_id: str, code: str, title: str, gender: str, prefix: str, text: str, warning: str):
    sections_raw, questions = parse_structure(text)
    # Ensure section 1 is demographics even if parser caught it
    if not sections_raw or "اطلاعات پایه" not in sections_raw[0]["title"]:
        sections_raw.insert(0, {"order": 1, "title": "اطلاعات پایه"})
        for q in questions:
            q["sectionOrder"] = q["sectionOrder"] + (0 if q["sectionOrder"] else 0)

    # Rebuild section ids consistently: demographics is section 1; question sections keep titles
    # If parser already has اطلاعات پایه as first, keep; questions may wrongly attach to it — fix by section title.
    sections = []
    items = []
    # Always create demographics (base info) section first
    base_sec_id = f"{prefix}_SEC_1"
    sections.append(
        {
            "id": base_sec_id,
            "formId": form_id,
            "code": f"{prefix}_SEC_BASE",
            "title": "اطلاعات پایه",
            "sortOrder": 1,
            "timeWindowHint": "",
            "guideText": "این بخش برای تفسیر درست خطر و انتخاب روش غربالگری لازم است.",
        }
    )
    items.extend(demographic_items(prefix, form_id, base_sec_id))

    # Map remaining sections (skip first if it's demographics)
    q_sections = [s for s in sections_raw if "اطلاعات پایه" not in s["title"]]
    # If parser included demographics as order 1, question sectionOrder already points to it for early qs — remap
    # Better: group questions by sectionOrder and assign titles from sections_raw by order
    title_by_order = {s["order"]: s["title"] for s in sections_raw}
    used_orders = sorted({q["sectionOrder"] for q in questions})
    order_to_sec_id = {}
    sort = 2
    for order in used_orders:
        title = title_by_order.get(order, f"بخش {order}")
        if "اطلاعات پایه" in title:
            # questions should not live in demographics; bump them into next content section if any
            continue
        sec_id = f"{prefix}_SEC_{sort}"
        order_to_sec_id[order] = sec_id
        sections.append(
            {
                "id": sec_id,
                "formId": form_id,
                "code": f"{prefix}_SEC_{sort}",
                "title": title,
                "sortOrder": sort,
                "timeWindowHint": "۳ ماه اخیر" if "۳ ماه" in title or "3 ماه" in title else "",
                "guideText": "اگر پاسخ بله است، در توضیحات مدت/تاریخ/شدت را بنویسید.",
            }
        )
        sort += 1

    # If some questions landed on demographics section order, attach them to first clinical section
    fallback_sec = next((s["id"] for s in sections if s["id"] != base_sec_id), None)

    for q in sorted(questions, key=lambda x: x["num"]):
        sec_id = order_to_sec_id.get(q["sectionOrder"]) or fallback_sec
        if not sec_id:
            continue
        sec_title = next(s["title"] for s in sections if s["id"] == sec_id)
        item_code = f"{prefix}_Q{q['num']}"
        tags = ai_tags(q["label"], gender)
        items.append(
            {
                "id": f"{prefix}_ITEM_{q['num']}",
                "sectionId": sec_id,
                "code": item_code,
                "labelFa": q["label"],
                "inputType": "yn_unk",
                "required": True,
                "sortOrder": q["num"],
                "visibilityRules": q["visibilityRules"],
                "helpText": "",
                "notesPolicy": "required_if_yes",
                "prefillFromPatient": None,
                "readOnlyIfPrefill": False,
                "selectOptions": None,
                "coding": {
                    "snomed": [],
                    "loinc": [],
                    "icd10": [],
                    "umls": [],
                    "conceptKind": concept_kind(q["label"], sec_title),
                    "aiTags": tags,
                    "redFlagOnYes": "red_flag" in tags,
                },
            }
        )

    # Electronic forms do not require paper signature/confirmation section.
    return {
        "id": form_id,
        "code": code,
        "title": title,
        "version": 2,
        "status": "published",
        "sortOrder": 1 if gender == "male" else 2,
        "warningText": warning,
        "targetAudience": {
            "gender": "مرد" if gender == "male" else "زن",
            "ageMin": None,
            "ageMax": None,
            "maritalStatuses": [],
        },
        "sections": sections,
        "items": items,
    }


WARNING = (
    "اگر هر یک از علائم هشدار (خونریزی، توده جدید، کاهش وزن بی‌دلیل، تب یا تعریق شبانه پایدار، "
    "درد شدید یا پیشرونده) را دارید، ارزیابی پزشکی را به تعویق نیندازید. این پرسشنامه برای غربالگری "
    "و پشتیبانی تصمیم پزشک است و جایگزین معاینه یا تشخیص نیست."
)


def main():
    male_text = load_extracted("male")
    female_text = load_extracted("female")
    assert "پروستات" in male_text, "male text mismatch"
    assert "پستان" in female_text, "female text mismatch"

    male = build_form(
        "form_cancer_male_v02",
        "cancer_screening_male_v02",
        "پرسشنامه سرطان آقایان ۰۲",
        "male",
        "CA_M",
        male_text,
        WARNING,
    )
    female = build_form(
        "form_cancer_female_v02",
        "cancer_screening_female_v02",
        "پرسشنامه سرطان بانوان ۰۲",
        "female",
        "CA_F",
        female_text,
        WARNING,
    )

    coding_map = load_coding_map()
    apply_coding_map(male, coding_map)
    apply_coding_map(female, coding_map)

    male_q = [i for i in male["items"] if i["inputType"] == "yn_unk"]
    female_q = [i for i in female["items"] if i["inputType"] == "yn_unk"]
    print("male yn", len(male_q), "sections", len(male["sections"]))
    print("female yn", len(female_q), "sections", len(female["sections"]))
    m_nums = {int(i["code"].split("_Q")[1]) for i in male_q}
    f_nums = {int(i["code"].split("_Q")[1]) for i in female_q}
    print("male missing", sorted(set(range(1, 78)) - m_nums))
    print("female missing", sorted(set(range(1, 65)) - f_nums))

    catalog = {"forms": [male, female], "schemaVersion": 2}
    OUT.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", OUT, "bytes", OUT.stat().st_size)


if __name__ == "__main__":
    main()
