from pathlib import Path

p = Path(r"C:\Adel\Projects\Own\Maryam\clinicPreAdmit\type3\frontend\src\components\PatientMobileProfile.tsx")
text = p.read_text(encoding="utf-8")
start = text.find("          {/* ================= TAB 2: DOCS-DRIVEN PRE-ADMIT QUESTIONNAIRE ================= */}")
end = text.find("          {/* ================= TAB 3: HOSPITAL WAYFINDING ================= */}")
print("start", start, "end", end)
if start < 0 or end < 0:
    raise SystemExit("markers not found")
replacement = """          {/* ================= TAB 2: DOCS-DRIVEN PRE-ADMIT QUESTIONNAIRE ================= */}
          {activeTab === \"intake\" && (
            <div className=\"space-y-4\">
              <PreAdmitFormRenderer
                patient={patient}
                forms={snapshot.forms ?? []}
                onAction={onAction}
                busy={busy}
                readOnly={readOnly}
              />
            </div>
          )}

"""
text = text[:start] + replacement + text[end:]
p.write_text(text, encoding="utf-8")
print("ok", len(text))
