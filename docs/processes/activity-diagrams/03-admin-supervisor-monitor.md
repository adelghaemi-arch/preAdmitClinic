# فرایند v1: مانیتور ادمین کلینیک و ناظر سازمان

## هدف

ادمین بیمارستان و نماینده شرکت کلیات ثبت، دعوت و پیشرفت پیش‌پذیرش را بدون ورود به صف/نوبت مانیتور کنند.

## نقطه شروع / پایان

- **شروع:** قرارداد و اعضا وجود دارند
- **پایان:** وضعیت کلیات مشاهده شده؛ در صورت نیاز SMS یادآوری ارسال شده است

## نقش‌های درگیر

ادمین کلینیک، ناظر سازمان، سیستم

## یوزکیس‌های مرتبط

[UC-ADM-12](../use-cases/03-admin.md)، [UC-ADM-13](../use-cases/03-admin.md)، [UC-SUP-02](../use-cases/04-supervisor.md)–[UC-SUP-04](../use-cases/04-supervisor.md)

## دیاگرام فعالیت

```mermaid
flowchart TB
  subgraph adminLane [Admin]
    A1[OpenFunnelOrDashboard]
    A2[ReviewOnboardingStages]
    A3[OpenPatientForDetail]
    A4[OptionalBulkSMS]
  end

  subgraph supervisorLane [Supervisor]
    Su1[OTP_Login]
    Su2[OpenMonitorDashboard]
    Su3[ReviewEmployeeRoster]
    Su4[SendReminderSMS_ifAllowed]
  end

  subgraph systemLane [System]
    S1[AggregateContractStats]
    S2[UpdateOnboardingOnSMS]
  end

  A1 --> S1 --> A2 --> A3
  A2 --> A4 --> S2
  Su1 --> Su2 --> S1 --> Su3 --> Su4 --> S2
```

## خارج از این فرایند (فاز بعد)

زمان‌بندی سقفی نوبت روزانه، صف اتاق، پذیرش عملیاتی روز مراجعه.
