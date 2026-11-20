# فرایند: اتمام مراجعه و گزارش یک‌روزه

## هدف

بستن کامل مسیر درمانی روز و آماده‌سازی گزارش/اعلان نتیجه برای سلامتجو (و بازتاب به قرارداد در صورت پیوند).

## نقطه شروع / پایان

- **شروع:** آخرین ایستگاه فعال به `completed` می‌رسد
- **پایان:** `patient.completedAt` ثبت شده؛ اعلان `result_ready`؛ گزارش قابل مشاهده/چاپ؛ در قرارداد `visit_done`

## نقش‌های درگیر

پزشک یا پاراکلینیک (اتمام ایستگاه آخر)، سیستم، سلامتجو؛ اختیاری پذیرش

## یوزکیس‌های مرتبط

[UC-SPC-06](../use-cases/04-specialist.md)، [UC-PRC-02](../use-cases/05-paraclinic.md)، [UC-OWN-12](../use-cases/01-owner.md)، [UC-OWN-13](../use-cases/01-owner.md)

## دیاگرام فعالیت

```mermaid
flowchart TB
  subgraph staffLane [SpecialistOrParaclinic]
    St1[CompleteLastStation]
  end

  subgraph systemLane [System]
    Sy1[advancePatientFlowIfNeeded]
    Sy2{AnyPendingStation}
    Sy3[SetNextWaiting]
    Sy4[SetCompletedAt]
    Sy5[InsertResultReadyAlert]
    Sy6[UpdateContractMemberVisitDone]
  end

  subgraph ownerLane [Owner]
    Ow1[ReceiveResultReadyAlert]
    Ow2[MARK_ALERTS_READ]
    Ow3[OpenCompanionRecords]
    Ow4[ViewOrPrintEmrReport]
  end

  St1 --> Sy1 --> Sy2
  Sy2 -->|yes| Sy3
  Sy2 -->|no allCompleted| Sy4 --> Sy5 --> Sy6
  Sy5 --> Ow1 --> Ow2 --> Ow3 --> Ow4
```

## خروجی‌ها

| خروجی | شرح |
|-------|-----|
| `completedAt` | زمان اتمام مراجعه |
| اعلان `result_ready` | پیام آماده‌بودن PDF/گزارش |
| `appointmentStatus = visit_done` | اگر عضو قرارداد لینک شده باشد |
| گزارش یک‌روزه | UI چاپ/مشاهده برای سلامتجو و staff |
