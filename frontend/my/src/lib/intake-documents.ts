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

/** Prompt shown under a screening Y/N question when the answer is «بله». */
export type ScreeningDocumentPrompt = {
  documentType: IntakeDocumentType;
  titleFa: string;
  hintFa: string;
};

/**
 * Screening item codes → document upload prompts (same page, after the question).
 * Types listed here are offered contextually; remaining types stay on the final «مدارک» step.
 */
export const SCREENING_ITEM_DOCUMENT_PROMPTS: Readonly<Record<string, readonly ScreeningDocumentPrompt[]>> = {
  // Male — CA_M_SEC_10
  CA_M_Q68: [
    {
      documentType: "lab_blood",
      titleFa: "نتیجه آزمایش PSA",
      hintFa: "اگر برگه یا عکس آزمایش خون پروستات (PSA) را دارید، همین‌جا بفرستید.",
    },
  ],
  CA_M_Q70: [
    {
      documentType: "endoscopy",
      titleFa: "گزارش کولونوسکوپی",
      hintFa: "عکس یا PDF گزارش کولونوسکوپی را در صورت داشتن اینجا آپلود کنید.",
    },
  ],
  CA_M_Q71: [
    {
      documentType: "lab_blood",
      titleFa: "نتیجه خون مخفی مدفوع",
      hintFa: "برگه یا عکس نتیجه آزمایش خون مخفی در مدفوع را اینجا بفرستید.",
    },
  ],
  CA_M_Q72: [
    {
      documentType: "ct",
      titleFa: "سی‌تی دوز پایین ریه",
      hintFa: "گزارش یا تصویر سی‌تی اسکن غربالگری ریه را در صورت داشتن اینجا آپلود کنید.",
    },
  ],
  // Female — CA_F_SEC_9
  CA_F_Q57: [
    {
      documentType: "pathology",
      titleFa: "نتیجه پاپ اسمیر / HPV",
      hintFa: "برگه یا عکس نتیجه پاپ اسمیر یا تست HPV را اینجا بفرستید.",
    },
  ],
  CA_F_Q60: [
    {
      documentType: "mammography",
      titleFa: "ماموگرافی",
      hintFa: "عکس یا PDF گزارش ماموگرافی را در صورت داشتن اینجا آپلود کنید.",
    },
  ],
  CA_F_Q61: [
    {
      documentType: "ultrasound",
      titleFa: "سونوگرافی پستان",
      hintFa: "اگر سونوگرافی پستان دارید، گزارش یا تصویر آن را اینجا بفرستید.",
    },
    {
      documentType: "mri",
      titleFa: "ام‌آرآی پستان",
      hintFa: "اگر ام‌آرآی پستان دارید، گزارش یا تصویر آن را اینجا بفرستید.",
    },
  ],
  CA_F_Q62: [
    {
      documentType: "endoscopy",
      titleFa: "گزارش کولونوسکوپی",
      hintFa: "اگر کولونوسکوپی انجام داده‌اید، گزارش آن را اینجا آپلود کنید.",
    },
    {
      documentType: "lab_blood",
      titleFa: "نتیجه خون مخفی مدفوع",
      hintFa: "اگر تست خون مخفی مدفوع دارید، برگه یا عکس نتیجه را اینجا بفرستید.",
    },
  ],
};

/** Document types that can appear inline under screening questions. */
export const CONTEXTUAL_INTAKE_DOCUMENT_TYPES: ReadonlySet<IntakeDocumentType> = new Set(
  Object.values(SCREENING_ITEM_DOCUMENT_PROMPTS).flatMap((prompts) => prompts.map((p) => p.documentType))
);

export function screeningDocumentPromptsForItem(itemCode: string): readonly ScreeningDocumentPrompt[] {
  return SCREENING_ITEM_DOCUMENT_PROMPTS[itemCode] ?? [];
}

/** Types offered only on the final documents step (not tied to a screening question). */
export function intakeDocumentTypesForFinalPhase(gender: string) {
  return intakeDocumentTypesForGender(gender).filter((t) => !CONTEXTUAL_INTAKE_DOCUMENT_TYPES.has(t.code));
}

export function isAllowedIntakeMime(mimeType: string): boolean {
  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}

export function normalizeIntakeFilePayload(
  raw: unknown,
  idFactory: () => string,
  fallbackDocumentDate?: string | null
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
  const dateFromFile = String(row.documentDate ?? "").trim();
  const dateFallback = String(fallbackDocumentDate ?? "").trim();
  const documentDate = (dateFromFile || dateFallback || "").slice(0, 80) || null;
  return {
    ok: true,
    file: {
      id: idFactory(),
      fileName: fileName.slice(0, 180),
      mimeType: resolvedMime,
      dataUrl,
      documentDate,
    },
  };
}
