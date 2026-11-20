/*
 File: backend/src/Nabz.Domain/Enums/AppRole.cs
 Description: نقش‌های نسخهٔ ۱ مطابق docs/processes/use-cases/00-actors
 Parent Dependencies: none
 */

namespace Nabz.Domain.Enums;

public enum AppRole
{
    Owner = 1,
    Specialist = 2,
    Admin = 3,
    Supervisor = 4,
    Platform = 5
}
