/*
 File: backend/tests/Nabz.Api.Tests/Support/SmokeOtp.cs
 Description: کد OTP دمو برای smoke؛ ادمین کل = FixedOtp+1
 Parent Dependencies: PlatformAdminIdentity
 */

using Nabz.Application.Identity;

namespace Nabz.Api.Tests.Support;

public static class SmokeOtp
{
    public const string FixedOtp = "12345";

    public static string CodeFor(string mobile)
        => PlatformAdminIdentity.IsPlatformAdminMobile(mobile)
            ? PlatformAdminIdentity.IncrementFixedOtp(FixedOtp)
            : FixedOtp;
}
