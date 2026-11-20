/*
 File: backend/src/Nabz.Domain/Enums/DomainStatuses.cs
 Description: وضعیت‌های دامنهٔ v1 (فرم، onboarding، ضدتقلب، کلینیک)
 Parent Dependencies: none
 */

namespace Nabz.Domain.Enums;

public enum FormPublishStatus
{
    Draft = 0,
    Published = 1,
    Archived = 2
}

public enum FormResponseStatus
{
    Draft = 0,
    Submitted = 1
}

/// <summary>
/// قیف پیش‌ثبت‌نام قرارداد — مستقل از نوبت‌دهی (خارج v1).
/// </summary>
public enum OnboardingStage
{
    NotSent = 0,
    SmsSent = 1,
    LinkOpened = 2,
    LoggedIn = 3,
    Abandoned = 4,
    Completed = 5
}

public enum FraudReviewStatus
{
    Pending = 0,
    Cleared = 1,
    Flagged = 2
}

public enum ClinicStatus
{
    Onboarding = 0,
    Active = 1,
    Suspended = 2
}

public enum UserPhotoKind
{
    Portrait = 0,
    FraudAuto = 1,
    FraudConfirm = 2
}

public enum EvidencePackageKind
{
    CameraSession = 0,
    Burst = 1,
    Day = 2
}

public enum ContractStatus
{
    Draft = 0,
    Active = 1,
    Completed = 2
}
