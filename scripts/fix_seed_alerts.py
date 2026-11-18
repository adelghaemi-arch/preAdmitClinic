# -*- coding: utf-8 -*-
import re
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "frontend" / "src" / "lib" / "mock-dataset.ts"
t = p.read_text(encoding="utf-8")
pat = re.compile(
    r'"message": "([^"]+?) عزیز، پذیرش شما ثبت شد\. ایستگاه فعلی شما [^"]+?\."'
)

def repl(m: re.Match[str]) -> str:
    name = m.group(1)
    return (
        f'"message": "{name} عزیز، پذیرش کلینیک شما ثبت شد. '
        f"لطفاً ابتدا پرسشنامه پیش‌پذیرش را تکمیل کنید؛ مسیر ایستگاه‌ها بعد از آن فعال می‌شود.\""
    )

nt, n = pat.subn(repl, t)
print("replacements", n)
p.write_text(nt, encoding="utf-8")
