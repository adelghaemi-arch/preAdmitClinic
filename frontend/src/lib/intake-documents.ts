import type { IntakeDocumentType, PatientIntakeDocumentFile } from "@/types/clinic";

export const INTAKE_DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
export const INTAKE_DOCUMENT_MAX_GROUPS = 20;
export const INTAKE_DOCUMENT_MAX_FILES_PER_GROUP = 20;
/** Approx. 5MB binary as base64 data URL (~4/3 expansion + header). */
export const INTAKE_DOCUMENT_MAX_DATA_URL_CHARS = Math.ceil(INTAKE_DOCUMENT_MAX_BYTES * 1.4) + 128;

export const INTAKE_DOCUMENT_TYPES: ReadonlyArray<{
  code: IntakeDocumentType;
  labelFa: string;
  femaleOnly?: boolean;
}> = [
  { code: "lab_blood", labelFa: "آزمایش خون / بیوشیمی" },
  { code: "lab_urine", labelFa: "آزمایش ادرار" },
  { code: "pathology", labelFa: "پاتولوژی / بیوپسی" },
  { code: "ecg", labelFa: "نوار قلب (ECG)" },
  { code: "echo", labelFa: "اکوکاردیوگرافی" },
  { code: "ultrasound", labelFa: "سونوگرافی" },
  { code: "xray", labelFa: "رادیوگرافی (عکس ساده)" },
  { code: "ct", labelFa: "سی‌تی‌اسکن" },
  { code: "mri", labelFa: "ام‌آرآی" },
  { code: "mammography", labelFa: "ماموگرافی", femaleOnly: true },
  { code: "endoscopy", labelFa: "گزارش آندوسکوپی / کولونوسکوپی" },
  { code: "other", labelFa: "سایر مدارک پزشکی" },
];

const TYPE_SET = new Set(INTAKE_DOCUMENT_TYPES.map((t) => t.code));

export function isIntakeDocumentType(value: string): value is IntakeDocumentType {
  return TYPE_SET.has(value as IntakeDocumentType);
}

export function intakeDocumentLabelFa(code: IntakeDocumentType): string {
  return INTAKE_DOCUMENT_TYPES.find((t) => t.code === code)?.labelFa ?? code;
}

export function intakeDocumentTypesForGender(gender: string) {
  const female = gender === "زن";
  return INTAKE_DOCUMENT_TYPES.filter((t) => !t.femaleOnly || female);
}

export function isAllowedIntakeMime(mimeType: string): boolean {
  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}

export function normalizeIntakeFilePayload(
  raw: unknown,
  idFactory: () => string
): { ok: true; file: PatientIntakeDocumentFile } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "فایل مدرک معتبر نیست." };
  }
  const row = raw as Record<string, unknown>;
  const dataUrl = String(row.dataUrl ?? "").trim();
  const fileName = String(row.fileName ?? "").trim() || "document";
  const mimeType = String(row.mimeType ?? "").trim().toLowerCase();
  if (!dataUrl.startsWith("data:") || dataUrl.length < 32) {
    return { ok: false, error: "فایل مدرک معتبر نیست." };
  }
  const resolvedMime =
    mimeType ||
    (dataUrl.startsWith("data:application/pdf")
      ? "application/pdf"
      : dataUrl.startsWith("data:image/")
        ? dataUrl.slice(5, dataUrl.indexOf(";")) || "image/jpeg"
        : "");
  if (!isAllowedIntakeMime(resolvedMime) && !dataUrl.startsWith("data:image/") && !dataUrl.startsWith("data:application/pdf")) {
    return { ok: false, error: "فقط فایل PDF یا تصویر قابل بارگذاری است." };
  }
  if (!isAllowedIntakeMime(resolvedMime)) {
    return { ok: false, error: "فقط فایل PDF یا تصویر قابل بارگذاری است." };
  }
  if (dataUrl.length > INTAKE_DOCUMENT_MAX_DATA_URL_CHARS) {
    return { ok: false, error: "حجم فایل باید حداکثر ۵ مگابایت باشد." };
  }
  return {
    ok: true,
    file: {
      id: idFactory(),
      fileName: fileName.slice(0, 180),
      mimeType: resolvedMime,
      dataUrl,
    },
  };
}
