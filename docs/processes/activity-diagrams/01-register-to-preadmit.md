# فرایند v1: ثبت در سیستم/قرارداد تا تکمیل پیش‌پذیرش

## هدف

از ثبت بیمار در قرارداد و سیستم تا تکمیل پرسشنامه، مدارک، عکس و GPS توسط سلامتجو.

## نقطه شروع / پایان

- **شروع:** ایجاد/ایمپورت عضو قرارداد و ثبت بیمار در سیستم توسط ادمین
- **پایان:** پیش‌پذیرش submitted (`intakeCompleted`) و شواهد عکس/GPS در صورت ثبت

## نقش‌های درگیر

ادمین کلینیک، سلامتجو، سیستم (پلتفرم بعداً شواهد را می‌بیند)

## یوزکیس‌های مرتبط

[UC-ADM-04](../use-cases/03-admin.md)، [UC-ADM-06](../use-cases/03-admin.md)، [UC-ADM-08](../use-cases/03-admin.md)، [UC-OWN-01](../use-cases/01-owner.md)–[UC-OWN-10](../use-cases/01-owner.md)

## دیاگرام فعالیت

```mermaid
flowchart TB
  subgraph adminLane [Admin]
    A1[CreateOrImportContractMembers]
    A2[SendInviteSMS]
    A3[RegisterPatientInSystem]
  end

  subgraph ownerLane [Owner]
    O1[OTP_Login]
    O2[OpenPreAdmitForm]
    O3[SaveDraftOptional]
    O4[AddDocsPhotoGps]
    O5[SubmitPreAdmit]
  end

  subgraph systemLane [System]
    S1[CreatePatientRecord]
    S2[StoreFormResponseSubmitted]
    S3[StorePhotoAndGpsEvidence]
  end

  A1 --> A2 --> A3 --> S1 --> O1 --> O2
  O2 --> O3 --> O4 --> O5
  O2 --> O5
  O4 --> S3
  O5 --> S2
```

## خارج از این فرایند (فاز بعد)

صف اتاق، نوبت، ایستگاه، QR پذیرش عملیاتی، اعلام حضور.
