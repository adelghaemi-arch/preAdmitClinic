# -*- coding: utf-8 -*-
"""Export ideal visibility matrix from form-catalog.seed.json to Excel + summary rows."""
from __future__ import annotations

import json
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "frontend" / "src" / "lib" / "form-catalog.seed.json"
OUT_XLSX = ROOT / "docs" / "شرط-نمایش-مخاطب-پرسشنامه.xlsx"

CATEGORY_LABELS = {
    ("maritalStatus", "married"): "متأهل / ازدواج‌کرده",
    ("maritalStatus", "single"): "فقط مجرد",
    ("age", "gte50"): "سن ≥ ۵۰",
}


def categorize_rule(rule: dict) -> str:
    field = rule.get("field")
    op = rule.get("op")
    value = rule.get("value")
    if field == "maritalStatus" and op == "in" and isinstance(value, list):
        vals = [str(v) for v in value]
        if vals == ["مجرد"]:
            return CATEGORY_LABELS[("maritalStatus", "single")]
        if "متأهل" in vals or "ازدواج‌کرده" in vals:
            return CATEGORY_LABELS[("maritalStatus", "married")]
    if field == "age" and op == "gte" and int(value) >= 50:
        return CATEGORY_LABELS[("age", "gte50")]
    return f"{field} {op} {value}"


def rule_value_text(rule: dict) -> str:
    value = rule.get("value")
    if isinstance(value, list):
        return "، ".join(str(v) for v in value)
    return str(value)


def load_forms() -> list[dict]:
    data = json.loads(SEED.read_text(encoding="utf-8"))
    return list(data.get("forms") or [])


def conditional_rows(forms: list[dict]) -> list[dict]:
    rows = []
    for form in forms:
        sections = {s["id"]: s for s in form.get("sections") or []}
        for item in form.get("items") or []:
            rules = item.get("visibilityRules") or []
            if not rules:
                continue
            section = sections.get(item.get("sectionId"), {})
            for rule in rules:
                rows.append(
                    {
                        "formId": form.get("id"),
                        "formTitle": form.get("title"),
                        "gender": (form.get("targetAudience") or {}).get("gender"),
                        "sectionCode": section.get("code", ""),
                        "sectionTitle": section.get("title", ""),
                        "itemCode": item.get("code"),
                        "labelFa": item.get("labelFa"),
                        "category": categorize_rule(rule),
                        "field": rule.get("field"),
                        "op": rule.get("op"),
                        "value": rule_value_text(rule),
                        "note": "شرط ایده‌آل اعمال‌شده در کاتالوگ",
                    }
                )
    rows.sort(key=lambda r: (r["gender"] or "", r["sectionCode"], r["itemCode"], r["field"]))
    return rows


def section_rows(forms: list[dict]) -> list[dict]:
    rows = []
    for form in forms:
        items = form.get("items") or []
        for section in sorted(form.get("sections") or [], key=lambda s: s.get("sortOrder", 0)):
            if "SIG" in (section.get("code") or "") or section.get("title") == "تأیید و امضا":
                continue
            section_items = [i for i in items if i.get("sectionId") == section["id"] and "_SIG_" not in (i.get("code") or "")]
            gated = [i for i in section_items if i.get("visibilityRules")]
            ungated = [i for i in section_items if not i.get("visibilityRules")]
            cats = sorted(
                {
                    categorize_rule(rule)
                    for i in gated
                    for rule in (i.get("visibilityRules") or [])
                }
            )
            hide_when = (
                "وقتی همه سوالات قابل‌نمایش این بخش برای مخاطب فعلی مخفی شوند، بخش از استپر حذف می‌شود."
                if gated and not ungated
                else (
                    "بخش ترکیبی است؛ فقط سوالات مشروط مخفی می‌شوند و بخش می‌ماند مگر اینکه هیچ سوالی نماند."
                    if gated
                    else "همه سوالات برای همه مخاطبان این فرم؛ بخش همیشه دیده می‌شود."
                )
            )
            rows.append(
                {
                    "formId": form.get("id"),
                    "gender": (form.get("targetAudience") or {}).get("gender"),
                    "sectionCode": section.get("code"),
                    "sectionTitle": section.get("title"),
                    "itemCount": len(section_items),
                    "gatedCount": len(gated),
                    "categories": "، ".join(cats) if cats else "—",
                    "hideWhen": hide_when,
                }
            )
    return rows


def write_xlsx(cond_rows: list[dict], sec_rows: list[dict]) -> None:
    wb = Workbook()

    ws1 = wb.active
    ws1.title = "سوالات مشروط"
    headers1 = [
        "فرم",
        "جنسیت مخاطب فرم",
        "کد بخش",
        "عنوان بخش",
        "کد سوال",
        "متن سوال",
        "دسته شرط",
        "field",
        "op",
        "value",
        "توضیح",
    ]
    ws1.append(headers1)
    for r in cond_rows:
        ws1.append(
            [
                r["formId"],
                r["gender"],
                r["sectionCode"],
                r["sectionTitle"],
                r["itemCode"],
                r["labelFa"],
                r["category"],
                r["field"],
                r["op"],
                r["value"],
                r["note"],
            ]
        )
    for cell in ws1[1]:
        cell.font = Font(bold=True)
    ws1.column_dimensions["F"].width = 55
    ws1.column_dimensions["G"].width = 22

    ws2 = wb.create_sheet("بخش‌ها")
    headers2 = [
        "فرم",
        "جنسیت",
        "کد بخش",
        "عنوان بخش",
        "تعداد سوال",
        "تعداد مشروط",
        "دسته‌های شرط",
        "زمان حذف از استپر",
    ]
    ws2.append(headers2)
    for r in sec_rows:
        ws2.append(
            [
                r["formId"],
                r["gender"],
                r["sectionCode"],
                r["sectionTitle"],
                r["itemCount"],
                r["gatedCount"],
                r["categories"],
                r["hideWhen"],
            ]
        )
    for cell in ws2[1]:
        cell.font = Font(bold=True)
    ws2.column_dimensions["H"].width = 70

    ws3 = wb.create_sheet("راهنما")
    guide = [
        ["موضوع", "تعریف ایده‌آل"],
        ["فرم فقط ≥ ۱۸", "targetAudience.ageMin=18 روی فرم مرد و زن؛ زیر ۱۸ فرم دریافت نمی‌کند"],
        ["متأهل / ازدواج‌کرده", "باروری، علائم جنسی، سابقه HPV، پاپ اسمیر / HPV غربالگری"],
        ["سن ≥ ۵۰ زن", "یائسگی، خونریزی بعد یائسگی، ماموگرافی، کولون زنانه"],
        ["سن ≥ ۵۰ مرد", "PSA، معاینه پروستات، کولون، FOBT، LDCT ریه، آگاهی پروستات"],
        ["همه", "واکسن HPV و سایر سوالات بدون visibilityRules (پس از عبور از سن فرم)"],
        ["فقط مجرد", "قابلیت ادمین موجود است؛ در کاتالوگ فعلی آیتم مجرد-only نداریم"],
        ["حذف بخش خالی", "اگر بعد از فیلتر هیچ سوال قابل‌نمایش در بخش نماند، بخش در استپر بیمار دیده نمی‌شود"],
        ["منبع داده", str(SEED.relative_to(ROOT))],
        ["بازتولید", "python scripts/export_visibility_matrix.py"],
    ]
    for row in guide:
        ws3.append(row)
    for cell in ws3[1]:
        cell.font = Font(bold=True)
    ws3.column_dimensions["A"].width = 22
    ws3.column_dimensions["B"].width = 80
    for row in ws3.iter_rows(min_row=2, max_row=ws3.max_row, min_col=2, max_col=2):
        for cell in row:
            cell.alignment = Alignment(wrap_text=True)

    OUT_XLSX.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT_XLSX)
    print(f"Wrote {OUT_XLSX} ({len(cond_rows)} conditional rows, {len(sec_rows)} sections)")


def main() -> None:
    forms = load_forms()
    write_xlsx(conditional_rows(forms), section_rows(forms))


if __name__ == "__main__":
    main()
