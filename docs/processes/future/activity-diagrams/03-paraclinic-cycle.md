# فرایند: چرخه پاراکلینیک

## هدف

انجام خدمت تشخیصی از صف تا ثبت نتیجه و تکمیل ایستگاه.

## نقطه شروع / پایان

- **شروع:** ایستگاه پاراکلینیک در `waiting` (پس از advance یا ارجاع)
- **پایان:** ایستگاه `completed` و پیشبرد مسیر توسط سیستم

## نقش‌های درگیر

سلامتجو (حضور)، کارشناس پاراکلینیک، سیستم؛ در صورت نیاز پذیرش برای صف

## یوزکیس‌های مرتبط

[UC-OWN-11](../use-cases/01-owner.md)، [UC-PRC-01](../use-cases/05-paraclinic.md)–[UC-PRC-03](../use-cases/05-paraclinic.md)

## وضعیت‌های اختصاصی

`waiting` → `checked_in` (اختیاری) → `in_progress` → `sample_taken` (اختیاری) → `completed`

## دیاگرام فعالیت

```mermaid
flowchart TB
  subgraph ownerLane [Owner]
    O1[ArriveAtLabOrImaging]
    O2[OptionalStationCheckIn]
  end

  subgraph paraclinicLane [Paraclinic]
    P1[OpenDiagnosticsQueue]
    P2[UPDATE_PARACLINIC_STATUS_in_progress]
    P3[UPDATE_PARACLINIC_STATUS_sample_taken]
    P4[UPLOAD_PARACLINIC_RESULT]
    P5[MarkCompletedViaStatusOrUpload]
  end

  subgraph systemLane [System]
    S1[advancePatientFlowIfNeeded]
    S2[ActivateNextStationOrFinishVisit]
  end

  O1 --> O2 --> P1
  P1 --> P2
  P2 --> P3
  P2 --> P4
  P3 --> P4
  P4 --> P5
  P2 --> P5
  P5 --> S1 --> S2
```

## قواعد

- آپلود نتیجه می‌تواند هم‌زمان ایستگاه را تکمیل کند.
- اتاق‌های با `category = paraclinic` در این فرایند قرار می‌گیرند (مثلاً LAB، ECG، RADIO).
