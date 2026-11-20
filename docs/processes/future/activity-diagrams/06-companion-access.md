# فرایند: دسترسی همراه سلامتجو

## هدف

ایجاد، محدودسازی و استفاده از دسترسی همراه به پرونده سلامتجو تا قطع لینک.

## نقطه شروع / پایان

- **شروع:** درخواست لینک همراه توسط سلامتجو (feature روشن)
- **پایان:** همراه در محدوده `permission`/`visibility` پیگیری می‌کند، یا لینک قطع می‌شود

## نقش‌های درگیر

سلامتجو (`owner`)، همراه (`patient`)، سیستم

## یوزکیس‌های مرتبط

[UC-OWN-17](../use-cases/01-owner.md)، [UC-CMP-01](../use-cases/02-companion.md)–[UC-CMP-10](../use-cases/02-companion.md)

## مدل اجازه

| سطح | معنی |
|-----|------|
| `manage` | پیگیری + چک‌این/خانه (نه فرم/عکس/مدارک) |
| `follow` | فقط مشاهده در محدوده visibility |
| visibility flags | journey، results، diagnoses، medications، allergies، familyHistory، reports |

## دیاگرام فعالیت

```mermaid
flowchart TB
  subgraph ownerLane [Owner]
    O1[OpenPrivacyOrLinks]
    O2[LINK_COMPANION]
    O3[UPDATE_COMPANION_VISIBILITY]
    O4[UNLINK_COMPANION]
  end

  subgraph companionLane [Companion]
    C1[SwitchToPatientRole]
    C2[SelectLinkedPatient]
    C3{PermissionManage}
    C4[ViewAllowedSections]
    C5[PATIENT_STATION_CHECKIN_or_HOME]
    C6[FollowOnlyView]
  end

  subgraph systemLane [System]
    S1{COMPANION_FEATURE_ENABLED}
    S2[EnforceSelfOnlyIntakeRules]
    S3[DenyIfNoLink]
  end

  S1 -->|false| Blocked[FeatureDisabled403]
  S1 -->|true| O1 --> O2 --> O3
  O2 --> C1 --> C2
  C2 --> S3
  S3 --> C3
  C3 -->|manage| C4 --> C5
  C3 -->|follow| C6
  C5 --> S2
  O4 --> EndLink[AccessRemoved]
```

## قواعد سخت

- پرسشنامه، عکس و مدارک intake فقط با رابطه `self`.
- نقش `owner` روی لینک غیر-self کار نمی‌کند؛ باید نقش همراه فعال شود.
- با feature خاموش، تمام `LINK/UNLINK/UPDATE_COMPANION_VISIBILITY` → 403.
