# فرایند: قیف قرارداد سازمانی تا پذیرش روز مراجعه

## هدف

از تعریف قرارداد تا دعوت، زمان‌بندی سقفی، و پذیرش عضو در کلینیک در روز چکاپ.

## نقطه شروع / پایان

- **شروع:** `CREATE_CONTRACT` توسط ادمین
- **پایان:** بیمار کلینیک ساخته‌شده و ورود به فرایند [پذیرش تا پیش‌پذیرش](01-admission-to-intake.md)

## نقش‌های درگیر

ادمین کلینیک، ناظر سازمان، عضو/سلامتجو (لینک دعوت)، سیستم

## یوزکیس‌های مرتبط

[UC-ADM-12](../use-cases/06-admin.md)–[UC-ADM-26](../use-cases/06-admin.md)، [UC-SUP-04](../use-cases/08-supervisor.md)، [UC-OWN-01](../use-cases/01-owner.md)

## وضعیت‌های قیف

**Onboarding:** `not_sent` → `sms_sent` → `link_opened` → `logged_in` → `completed` | `abandoned`

**نوبت:** `unscheduled` → `pinned` | `auto_scheduled` → `checked_in` → `visit_done`

## دیاگرام فعالیت

```mermaid
flowchart TB
  subgraph adminLane [Admin]
    A1[CREATE_CONTRACT]
    A2[UPDATE_CONTRACT_SUPERVISOR_and_API]
    A3[IMPORT_or_SYNC_Members]
    A4[SAVE_PACKAGE_RULES]
    A5[UPSERT_DAY_QUOTA]
    A6[RUN_DAY_AUTO_SCHEDULE_or_PIN]
    A7[SEND_CONTRACT_BULK_SMS]
    A8[ADMIT_CONTRACT_MEMBER_TO_CLINIC]
  end

  subgraph supervisorLane [Supervisor]
    Su1[MonitorRoster]
    Su2[SEND_CONTRACT_BULK_SMS_ifAllowed]
  end

  subgraph memberLane [EmployeeOwner]
    M1[OpenInviteLink]
    M2[UPDATE_MEMBER_ONBOARDING_stages]
    M3[OTP_LoginAsOwner]
  end

  subgraph systemLane [System]
    S1[AssignInviteTokens]
    S2[CreatePatientAndStations]
    S3[HandOffToIntakeProcess]
  end

  A1 --> A2 --> A3 --> A4 --> A5 --> A6
  A6 --> A7
  A7 --> S1 --> M1 --> M2 --> M3
  Su1 --> Su2
  Su2 --> S1
  A6 --> A8 --> S2 --> S3
```

## قواعد

- ناظر فقط `SEND_CONTRACT_BULK_SMS` را از میان contract-actions اجرا می‌کند.
- `UPDATE_MEMBER_ONBOARDING` می‌تواند از لینک دعوت (بدون نقش ادمین) هم بیاید.
- پذیرش روز مراجعه مسیر ایستگاه‌ها را از pathway/بسته عضو می‌سازد.
