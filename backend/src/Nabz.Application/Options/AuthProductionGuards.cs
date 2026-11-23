/*
 File: backend/src/Nabz.Application/Options/AuthProductionGuards.cs
 Description: جلوگیری از Auth:FixedOtp در Production
 Parent Dependencies: —
 */

namespace Nabz.Application.Options;

public static class AuthProductionGuards
{
    public const string FixedOtpForbiddenInProductionMessage =
        "در Production مقدار Auth:FixedOtp باید خالی باشد (OTP واقعی از سامانه پیامک).";

    public static void EnsureFixedOtpAllowed(bool isProduction, string? fixedOtp)
    {
        // در prod کد ثابت یعنی SMS قطع و کد نمایشی گمراه‌کننده (مثل ۱۱۱۱۱)
        if (isProduction && !string.IsNullOrWhiteSpace(fixedOtp))
            throw new InvalidOperationException(FixedOtpForbiddenInProductionMessage);
    }
}
