# -*- coding: utf-8 -*-
"""Replace user-facing Persian 'بیمار' terminology with 'سلامتجو' in frontend src.
Skips 'بیماری' (disease) by protecting it during replacement.
Does not rename English identifiers (patientId, PatientFullDto, etc.).
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "frontend" / "src"

# Longer / more specific phrases first
REPLACEMENTS = [
    ("همراه بیمار", "همراه سلامتجو"),
    ("همراه‌ بیمار", "همراه سلامتجو"),
    ("خود بیمار", "خود سلامتجو"),
    ("این بیمار", "این سلامتجو"),
    ("همان بیمار", "همان سلامتجو"),
    ("هر بیمار", "هر سلامتجو"),
    ("پرونده بیمار", "پرونده سلامتجو"),
    ("پرونده بیماری", "پرونده سلامتجو"),  # ambiguous Persian; treat as person file in UI copy
    ("کارت پذیرش بیمار", "کارت پذیرش سلامتجو"),
    ("ورود بیمار", "ورود سلامتجو"),
    ("حضور بیمار", "حضور سلامتجو"),
    ("نام بیمار", "نام سلامتجو"),
    ("کد ملی بیمار", "کد ملی سلامتجو"),
    ("موبایل بیمار", "موبایل سلامتجو"),
    ("جستجوی بیماران", "جستجوی سلامتجویان"),
    ("فهرست بیماران", "فهرست سلامتجویان"),
    ("جدول زنده بیماران", "جدول زنده سلامتجویان"),
    ("جریان زنده بیماران", "جریان زنده سلامتجویان"),
    ("جریان لحظه‌ای بیماران", "جریان لحظه‌ای سلامتجویان"),
    ("بیماران حاضر", "سلامتجویان حاضر"),
    ("بیماران من", "سلامتجویان من"),
    ("بیماران همراهی‌شده", "سلامتجویان همراهی‌شده"),
    ("بیماران خود", "سلامتجویان خود"),
    ("بیماران ارجاع‌شده", "سلامتجویان ارجاع‌شده"),
    ("بیماران در", "سلامتجویان در"),
    ("بیماران به", "سلامتجویان به"),
    ("بیماران از", "سلامتجویان از"),
    ("بیماران و", "سلامتجویان و"),
    ("تمام بیماران", "تمام سلامتجویان"),
    ("همه بیماران", "همه سلامتجویان"),
    ("میانگین زمان کل حضور بیمار", "میانگین زمان کل حضور سلامتجو"),
    ("تعداد مراجعین فعال", "تعداد سلامتجویان فعال"),
    ("نقشه موبایل بیماران", "نقشه موبایل سلامتجویان"),
    ("پرونده الکترونیک بیماران", "پرونده الکترونیک سلامتجویان"),
    ("داشبورد شخصی، شرح حال", "داشبورد شخصی، پرسشنامه پیش‌پذیرش"),
    ("وضعیت شرح حال بیمار", "وضعیت پرسشنامه سلامتجو"),
    ("شرح حال بیمار", "پرسشنامه سلامتجو"),
    ("شرح حال بالینی فقط در داشبورد خود بیمار", "پرسشنامه پیش‌پذیرش فقط در داشبورد خود سلامتجو"),
    ("بیمار اجازه", "سلامتجو اجازه"),
    ("از همراه بیمار شروع کنید", "از همراه سلامتجو شروع کنید"),
    ("بیماران و پرونده‌ها", "سلامتجویان و پرونده‌ها"),
]

# Final generic replacements (word-boundary-ish for Persian)
GENERIC = [
    ("بیماران", "سلامتجویان"),
    ("بیمار", "سلامتجو"),
]


def protect_literals(text: str) -> tuple[str, list[str]]:
    held: list[str] = []

    def keep(m: re.Match[str]) -> str:
        held.append(m.group(0))
        return f"__PROTECTED_{len(held) - 1}__"

    # Protect بیمارستان before generic بیمار → سلامتجو replacement
    text = re.sub(r"بیمارستان", keep, text)
    # Protect بیماری and compounds like بیماری‌ها / بیماریهای
    text = re.sub(r"بیماری\u200c?ها?", keep, text)
    text = re.sub(r"بیماریهای", keep, text)
    text = re.sub(r"بیماری", keep, text)
    return text, held


def restore_literals(text: str, held: list[str]) -> str:
    for i, val in enumerate(held):
        text = text.replace(f"__PROTECTED_{i}__", val)
    return text


def transform(text: str) -> str:
    text, held = protect_literals(text)
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)
    for old, new in GENERIC:
        text = text.replace(old, new)
    return restore_literals(text, held)


def main() -> None:
    changed_files = 0
    total_hits = 0
    for path in ROOT.rglob("*"):
        if path.suffix not in {".ts", ".tsx"}:
            continue
        if "node_modules" in path.parts or "vendor" in path.parts:
            continue
        original = path.read_text(encoding="utf-8")
        if "بیمار" not in original:
            continue
        updated = transform(original)
        if updated == original:
            continue
        # count approximate replacements
        before = original.count("بیمار")
        after = updated.count("بیمار")
        total_hits += max(0, before - after)
        path.write_text(updated, encoding="utf-8")
        changed_files += 1
        print(f"updated {path.relative_to(ROOT)} (بیمار left: {after})")
    print(f"done files={changed_files} approx_replacements={total_hits}")


if __name__ == "__main__":
    main()
