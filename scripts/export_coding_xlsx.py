# -*- coding: utf-8 -*-
"""Export form item coding documentation to Excel under docs/."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "frontend" / "src" / "lib" / "form-catalog.seed.json"
INDEX = ROOT / "frontend" / "src" / "lib" / "terminology-index.json"
OUT = ROOT / "docs" / "کدینگ-آیتم‌های-پیش‌پذیرش.xlsx"


def ensure_openpyxl():
    try:
        import openpyxl  # noqa: F401
        return
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "openpyxl"])


def join_codes(values) -> str:
    return "; ".join(str(v) for v in (values or []) if v)


def main() -> None:
    ensure_openpyxl()
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font
    from openpyxl.utils import get_column_letter

    seed = json.loads(SEED.read_text(encoding="utf-8"))
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    by_cui = {c["cui"]: c for c in index.get("concepts", [])}

    wb = Workbook()
    ws_items = wb.active
    ws_items.title = "آیتم‌ها"

    item_headers = [
        "فرم",
        "کد آیتم",
        "برچسب فارسی",
        "conceptKind",
        "inputType",
        "redFlagOnYes",
        "SNOMED",
        "LOINC",
        "ICD-10",
        "UMLS CUI",
        "نام UMLS فارسی",
        "نام UMLS انگلیسی",
    ]
    ws_items.append(item_headers)

    for form in seed["forms"]:
        form_title = form.get("title") or form.get("code") or ""
        for item in form.get("items", []):
            coding = item.get("coding") or {}
            cuis = coding.get("umls") or []
            names_fa = []
            names_en = []
            for cui in cuis:
                hit = by_cui.get(cui)
                if hit:
                    names_fa.append(hit.get("nameFa") or "")
                    names_en.append(hit.get("nameEn") or "")
                else:
                    names_fa.append("")
                    names_en.append("")
            ws_items.append(
                [
                    form_title,
                    item.get("code", ""),
                    item.get("labelFa", ""),
                    coding.get("conceptKind", ""),
                    item.get("inputType", ""),
                    "بله" if coding.get("redFlagOnYes") else "خیر",
                    join_codes(coding.get("snomed")),
                    join_codes(coding.get("loinc")),
                    join_codes(coding.get("icd10")),
                    join_codes(cuis),
                    "; ".join(n for n in names_fa if n),
                    "; ".join(n for n in names_en if n),
                ]
            )

    ws_concepts = wb.create_sheet("مفاهیم")
    concept_headers = [
        "CUI",
        "نام فارسی",
        "نام انگلیسی",
        "SNOMED",
        "LOINC",
        "ICD-10",
        "kinds",
    ]
    ws_concepts.append(concept_headers)
    for concept in sorted(index.get("concepts", []), key=lambda c: c.get("cui", "")):
        ws_concepts.append(
            [
                concept.get("cui", ""),
                concept.get("nameFa", ""),
                concept.get("nameEn", ""),
                join_codes(concept.get("snomed")),
                join_codes(concept.get("loinc")),
                join_codes(concept.get("icd10")),
                join_codes(concept.get("kinds")),
            ]
        )

    header_font = Font(bold=True)
    for ws in (ws_items, ws_concepts):
        ws.freeze_panes = "A2"
        for cell in ws[1]:
            cell.font = header_font
            cell.alignment = Alignment(wrap_text=True, vertical="center")
        for col in range(1, ws.max_column + 1):
            letter = get_column_letter(col)
            max_len = 0
            for row in ws.iter_rows(min_col=col, max_col=col, values_only=True):
                val = row[0]
                if val is None:
                    continue
                max_len = max(max_len, len(str(val)))
            ws.column_dimensions[letter].width = min(max(12, max_len + 2), 48)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT)
    print(f"wrote {OUT}")
    print(f"items={ws_items.max_row - 1} concepts={ws_concepts.max_row - 1}")


if __name__ == "__main__":
    main()
