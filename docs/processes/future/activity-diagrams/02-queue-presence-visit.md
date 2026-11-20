# فرایند: صف، اعلام حضور و ویزیت تخصصی

## هدف

از آمادگی ایستگاه تا اتمام ویزیت پزشک و پیشبرد خودکار مسیر.

## نقطه شروع / پایان

- **شروع:** ایستگاه در `waiting` و (ترجیحاً) `intakeCompleted`
- **پایان:** ایستگاه متخصص `completed` و فراخوانی `advancePatientFlowIfNeeded`

## نقش‌های درگیر

سلامتجو، پذیرش، پزشک، سیستم

## یوزکیس‌های مرتبط

[UC-OWN-11](../use-cases/01-owner.md)، [UC-RCP-05](../use-cases/03-reception.md)–[UC-RCP-08](../use-cases/03-reception.md)، [UC-SPC-02](../use-cases/04-specialist.md)–[UC-SPC-06](../use-cases/04-specialist.md)

## چرخه وضعیت ایستگاه

```mermaid
stateDiagram-v2
  [*] --> pending
  pending --> waiting: advanceFlow
  waiting --> checked_in: PATIENT_STATION_CHECKIN
  waiting --> in_progress: CALL_PATIENT_IN
  checked_in --> in_progress: CALL_PATIENT_IN
  in_progress --> completed: COMPLETE_SPECIALIST_STATION
  completed --> [*]
```

## دیاگرام فعالیت بین‌نقشی

```mermaid
flowchart TB
  subgraph receptionLane [Reception]
    Rc1[MonitorCongestion]
    Rc2[REORDER_ROOM_or_PATIENT_QUEUE]
    Rc3[ASSIGN_TO_DOCTOR_ROOM]
    Rc4[SEND_PATIENT_ALERT]
  end

  subgraph ownerLane [Owner]
    Ow1{IntakeCompleted}
    Ow2[GoToRoomViaMap]
    Ow3[PATIENT_STATION_CHECKIN]
  end

  subgraph specialistLane [Specialist]
    Sp1[ViewWaitingList]
    Sp2[CALL_PATIENT_IN]
    Sp3[SAVE_CLINICAL_NOTE_AND_ORDERS]
    Sp4[OptionalUrgentStation]
    Sp5[COMPLETE_SPECIALIST_STATION]
  end

  subgraph systemLane [System]
    Sy1[advancePatientFlowIfNeeded]
    Sy2[NextPendingToWaiting]
    Sy3[move_to_room_alert]
  end

  Ow1 -->|no| Ow1
  Ow1 -->|yes| Ow2 --> Ow3
  Rc1 --> Rc2
  Rc1 --> Rc3
  Rc3 --> Rc4
  Ow3 --> Sp1
  Sp1 --> Sp2 --> Sp3 --> Sp4 --> Sp5 --> Sy1
  Sy1 -->|hasPending| Sy2 --> Sy3
  Sy1 -->|allCompleted| Done[SeeVisitCompletionProcess]
```

## قواعد کلیدی

- بدون `intakeCompleted` چک‌این ایستگاه رد می‌شود؛ ارجاع به مطب ممکن است بیمار را در صف بگذارد.
- فراخوان می‌تواند از `waiting` یا `checked_in` به `in_progress` برود.
- پس از `COMPLETE_SPECIALIST_STATION` سیستم یا ایستگاه بعدی را فعال می‌کند یا فرایند اتمام مراجعه را آغاز می‌کند.
