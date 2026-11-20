# فرایند v1: دسترسی پلتفرم به GPS و عکس‌ها

## هدف

ادمین کل شواهد عکس و GPS پیش‌پذیرش را ببیند، بازبینی کند و در صورت نیاز نشست را قطع کند.

## نقطه شروع / پایان

- **شروع:** سلامتجو عکس و/یا GPS را هنگام پیش‌پذیرش ثبت کرده است
- **پایان:** بازبینی ثبت شده و/یا نشست قطع شده است

## نقش‌های درگیر

سلامتجو (تولید شواهد)، ادمین کل، سیستم

## یوزکیس‌های مرتبط

[UC-OWN-05](../use-cases/01-owner.md)، [UC-OWN-09](../use-cases/01-owner.md)، [UC-OWN-10](../use-cases/01-owner.md)، [UC-PLT-07](../use-cases/05-platform.md)–[UC-PLT-10](../use-cases/05-platform.md)

## دیاگرام فعالیت

```mermaid
flowchart TB
  subgraph ownerLane [Owner]
    O1[CapturePhoto]
    O2[StartFraudCameraSession]
    O3[RecordGPS]
  end

  subgraph platformLane [Platform]
    P1[OpenFraudPanel]
    P2[ViewFramesAndPhotos]
    P3[ViewGPSPoint]
    P4[ReviewFraudSession]
    P5[RevokeSessionsIfNeeded]
    P6[AppendAudit]
  end

  subgraph systemLane [System]
    S1[StoreEvidence]
  end

  O1 --> S1
  O2 --> S1
  O3 --> S1
  S1 --> P1 --> P2 --> P3 --> P4
  P4 --> P5
  P4 --> P6
```

## کنترل کامل پلتفرم

علاوه بر شواهد، پلتفرم کاربران، تنظیمات، ممیزی و سلامت فنی را طبق [05-platform.md](../use-cases/05-platform.md) کنترل می‌کند.
