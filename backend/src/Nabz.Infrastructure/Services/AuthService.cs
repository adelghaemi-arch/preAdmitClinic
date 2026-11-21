/*
 File: backend/src/Nabz.Infrastructure/Services/AuthService.cs
 Description: OTP با عضو قرارداد/بیمار/ناظر؛ soft-admit؛ FixedOtp (+۱ ادمین کل) یا قالب کاوه‌نگار
 Parent Dependencies: IAuthRepository, IPlatformRepository, IPatientService, ISmsSender, AuthOptions, KavenegarOptions, PlatformAdminIdentity
 */

using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nabz.Application.Abstractions;
using Nabz.Application.Identity;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Application.Options;
using Nabz.Application.Security;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;

namespace Nabz.Infrastructure.Services;

public sealed class AuthService(
    IUserRepository users,
    IPersonRepository persons,
    IAuthRepository auth,
    IContractRepository contracts,
    IPatientRepository patients,
    IClinicRepository clinics,
    IPlatformRepository platform,
    IPatientService patientService,
    IUnitOfWork uow,
    ISmsSender sms,
    IOptions<AuthOptions> authOptions,
    IOptions<KavenegarOptions> kavenegarOptions,
    ILogger<AuthService> logger) : IAuthService
{
    public async Task<OtpRequestResult> RequestOtpAsync(string mobile, CancellationToken ct = default)
    {
        mobile = NormalizeMobile(mobile);
        if (string.IsNullOrWhiteSpace(mobile) || !IranMobile.IsValid(mobile))
            return new OtpRequestResult(false, null, "شماره موبایل نامعتبر است.");

        // ورود: کاربر، بیمار، عضو قرارداد معرفی‌شده، یا ناظر
        var userList = await users.ListByMobileAsync(mobile, ct);
        var clinic = await clinics.GetCurrentAsync(ct);
        var patientList = clinic is null
            ? []
            : await patients.ListByPhoneAsync(mobile, clinic.Id, ct);
        var memberList = clinic is null
            ? []
            : await contracts.ListActiveMembersByPhoneAsync(clinic.Id, mobile, ct);
        var supervisor = await contracts.GetSupervisorByPhoneAsync(mobile, ct);
        if (userList.Count == 0 && patientList.Count == 0 && memberList.Count == 0 && supervisor is null)
        {
            // اولویت: تلفن پشتیبانی پیش‌پذیرش کلینیک؛ سپس SupportPhone پلتفرم
            var settings = await platform.GetSettingsAsync(ct);
            var supportPhone = FirstNonEmpty(clinic?.PreAdmitSupportPhone, settings?.SupportPhone);
            return new OtpRequestResult(false, null, FormatUnknownMobileError(supportPhone));
        }

        return await IssueOtpAsync(mobile, OtpPurposes.Login, "ارسال پیامک ورود ناموفق بود.", ct);
    }

    /// <summary>پیام راهنما برای شماره ثبت‌نشده — با تلفن پشتیبانی پیش‌پذیرش.</summary>
    public static string FormatUnknownMobileError(string? supportPhone)
    {
        const string baseMsg =
            "شماره موبایل شما در سیستم ثبت نشده است. لطفاً با سازمان یا مجموعهٔ خود پیگیری کنید";
        var phone = supportPhone?.Trim();
        if (string.IsNullOrWhiteSpace(phone))
            return baseMsg + " یا با پشتیبانی پیش‌پذیرش تماس بگیرید.";
        return baseMsg + $"؛ در صورت نیاز با شماره {phone} تماس بگیرید.";
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var v in values)
        {
            if (!string.IsNullOrWhiteSpace(v))
                return v.Trim();
        }
        return null;
    }

    public async Task<OtpRequestResult> RequestActionOtpAsync(string mobile, string purpose, CancellationToken ct = default)
    {
        mobile = NormalizeMobile(mobile);
        if (string.IsNullOrWhiteSpace(mobile) || !IranMobile.IsValid(mobile))
            return new OtpRequestResult(false, null, "شماره موبایل نامعتبر است.");
        if (string.IsNullOrWhiteSpace(purpose))
            return new OtpRequestResult(false, null, "نوع OTP نامعتبر است.");

        return await IssueOtpAsync(mobile, purpose, "ارسال پیامک تأیید ناموفق بود.", ct);
    }

    public async Task<OtpRequestResult> VerifyActionOtpAsync(string mobile, string purpose, string code, CancellationToken ct = default)
    {
        mobile = NormalizeMobile(mobile);
        var challenge = await auth.GetLatestActiveOtpAsync(mobile, purpose, ct);
        if (challenge is null || challenge.CodeHash != Hash(code))
            return new OtpRequestResult(false, null, "کد نامعتبر یا منقضی است.");

        challenge.Consumed = true;
        challenge.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
        return new OtpRequestResult(true, null, null);
    }

    public async Task<OtpVerifyResult> VerifyOtpAsync(string mobile, string code, string? deviceLabel, string? appSurface, CancellationToken ct = default)
    {
        mobile = NormalizeMobile(mobile);
        var challenge = await auth.GetLatestActiveOtpAsync(mobile, OtpPurposes.Login, ct);
        if (challenge is null || challenge.CodeHash != Hash(code))
            return Fail("کد نامعتبر یا منقضی است.");

        challenge.Consumed = true;
        challenge.UpdatedAt = DateTime.UtcNow;

        var candidates = await BuildCandidatesAsync(mobile, ct);
        if (candidates.Count == 0)
        {
            // فقط ناظر خالص — اگر عضو قرارداد بود در BuildCandidates می‌آمد
            var supervisor = await contracts.GetSupervisorByPhoneAsync(mobile, ct);
            if (supervisor is null)
                return Fail("هویتی برای این شماره یافت نشد.");

            var user = await EnsureSupervisorUserAsync(mobile, supervisor, ct);
            return await IssueFullSessionAsync(user, deviceLabel, appSurface, mobile, ct);
        }

        if (candidates.Count == 1)
        {
            var nid = candidates[0].NationalId;
            await EnsureSoftAdmitForNationalIdAsync(nid, ct);
            var user = await ResolveUserForCandidateAsync(mobile, nid, ct);
            if (user is null)
                return Fail("هویت انتخاب‌شده نامعتبر است.");
            if (!user.IsActive)
                return Fail("حساب غیرفعال است.");
            return await IssueFullSessionAsync(user, deviceLabel, appSurface, mobile, ct);
        }

        // چند کدملی روی یک موبایل — نشست pending بدون نقش کاربردی
        var token = NewToken();
        var session = new AuthSession
        {
            UserId = null,
            TokenHash = Hash(token),
            DeviceLabel = string.IsNullOrWhiteSpace(deviceLabel) ? "web" : deviceLabel!,
            AppSurface = string.IsNullOrWhiteSpace(appSurface) ? "clinic_web" : appSurface!,
            LastSeenAt = DateTime.UtcNow,
            PendingSelection = true,
            PendingMobile = mobile,
            LoginMobile = mobile
        };
        await auth.AddSessionAsync(session, ct);
        await uow.SaveChangesAsync(ct);
        return new OtpVerifyResult(true, null, session.Id, token, null, true, candidates, null);
    }

    public async Task<OtpVerifyResult> SelectIdentityAsync(Guid sessionId, string nationalId, CancellationToken ct = default)
    {
        var session = await auth.GetSessionByIdAsync(sessionId, ct);
        if (session is null || session.RevokedAt is not null || !session.PendingSelection)
            return Fail("نشست انتخاب هویت نامعتبر است.");

        var mobile = NormalizeMobile(session.PendingMobile ?? string.Empty);
        if (string.IsNullOrWhiteSpace(mobile))
            return Fail("نشست انتخاب هویت نامعتبر است.");

        var nid = IranNationalId.Normalize(nationalId);
        var candidates = await BuildCandidatesAsync(mobile, ct);
        if (candidates.All(c => c.NationalId != nid))
            return Fail("کد ملی در فهرست این شماره نیست.");

        // soft-admit فقط بعد از انتخاب NID — جلوگیری از پرونده اشتباه
        await EnsureSoftAdmitForNationalIdAsync(nid, ct);
        var user = await ResolveUserForCandidateAsync(mobile, nid, ct);
        if (user is null)
            return Fail("هویت انتخاب‌شده نامعتبر است.");
        if (!user.IsActive)
            return Fail("حساب غیرفعال است.");

        session.UserId = user.Id;
        session.PendingSelection = false;
        session.PendingMobile = null;
        session.LoginMobile = mobile;
        session.LastSeenAt = DateTime.UtcNow;
        session.UpdatedAt = DateTime.UtcNow;
        user.LastLoginAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;

        await MarkMemberLoggedInAsync(nid, ct);
        await MaybeMultiSessionAlertAsync(user.Id, ct);
        await uow.SaveChangesAsync(ct);

        var roles = (await users.ListRolesAsync(user.Id, ct)).Select(r => r.Role).ToList();
        // توکن قبلی همان نشست را نگه می‌داریم؛ کلاینت همان Bearer را ادامه می‌دهد
        return new OtpVerifyResult(true, user.Id, session.Id, null, roles, false, null, null);
    }

    public async Task<AuthSessionPrincipal?> ValidateTokenAsync(string rawToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(rawToken)) return null;
        var session = await auth.GetActiveSessionByTokenHashAsync(Hash(rawToken.Trim()), ct);
        if (session is null) return null;

        session.LastSeenAt = DateTime.UtcNow;
        session.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);

        if (session.PendingSelection)
        {
            // بدون نقش — فقط otp/select و revoke مجازند
            return new AuthSessionPrincipal(Guid.Empty, session.Id, Array.Empty<string>(), null, true, PendingSelection: true);
        }

        if (session.UserId is not Guid uid) return null;
        var user = await users.GetByIdAsync(uid, ct);
        if (user is null || !user.IsActive) return null;

        var roleRows = await users.ListRolesAsync(user.Id, ct);
        var roles = roleRows.Select(r => r.Role.ToString()).ToList();
        var contractId = roleRows.FirstOrDefault(r => r.Role == AppRole.Supervisor && r.ContractId.HasValue)?.ContractId;
        return new AuthSessionPrincipal(user.Id, session.Id, roles, contractId, user.IsActive, PendingSelection: false);
    }

    public async Task<AuthMeDto?> GetMeAsync(Guid userId, CancellationToken ct = default)
    {
        if (userId == Guid.Empty) return null;
        var user = await users.GetByIdAsync(userId, ct);
        if (user is null) return null;
        var p = user.Person;
        var roleRows = await users.ListRolesAsync(user.Id, ct);
        var roles = roleRows.Select(r => r.Role).Distinct().ToList();
        var clinic = await clinics.GetCurrentAsync(ct);
        var contractId = roleRows.FirstOrDefault(r => r.Role == AppRole.Supervisor && r.ContractId.HasValue)?.ContractId;
        return new AuthMeDto(
            user.Id,
            p.FirstName,
            p.LastName,
            PersonName.Display(p.FirstName, p.LastName),
            p.Mobile,
            roles,
            clinic?.Id,
            contractId,
            user.IsActive);
    }

    public async Task<bool> RevokeSessionAsync(Guid sessionId, Guid actingUserId, bool allowOtherUsers, CancellationToken ct = default)
    {
        var session = await auth.GetSessionByIdAsync(sessionId, ct);
        if (session is null || session.RevokedAt is not null) return false;
        // نشست pending: فقط همان sessionId از claim
        if (session.PendingSelection)
        {
            session.RevokedAt = DateTime.UtcNow;
            session.UpdatedAt = DateTime.UtcNow;
            await uow.SaveChangesAsync(ct);
            return true;
        }
        if (!allowOtherUsers && session.UserId != actingUserId) return false;
        session.RevokedAt = DateTime.UtcNow;
        session.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);
        return true;
    }

    public async Task<int> RevokeOtherSessionsAsync(Guid userId, Guid keepSessionId, CancellationToken ct = default)
    {
        if (userId == Guid.Empty) return 0;
        var sessions = await auth.ListActiveSessionsAsync(userId, ct);
        var n = 0;
        foreach (var s in sessions.Where(x => x.Id != keepSessionId))
        {
            s.RevokedAt = DateTime.UtcNow;
            s.UpdatedAt = DateTime.UtcNow;
            n++;
        }
        if (n > 0) await uow.SaveChangesAsync(ct);
        return n;
    }

    public async Task<int> RevokeAllUserSessionsAsync(Guid userId, CancellationToken ct = default)
    {
        if (userId == Guid.Empty) return 0;
        var sessions = await auth.ListActiveSessionsAsync(userId, ct);
        foreach (var s in sessions)
        {
            s.RevokedAt = DateTime.UtcNow;
            s.UpdatedAt = DateTime.UtcNow;
        }
        if (sessions.Count > 0) await uow.SaveChangesAsync(ct);
        return sessions.Count;
    }

    private async Task<List<OtpIdentityCandidate>> BuildCandidatesAsync(string mobile, CancellationToken ct)
    {
        var userRows = await users.ListByMobileAsync(mobile, ct);

        // موبایل قفل ادمین کل: فقط حساب Platform — حتی اگر Patient روی همان شماره باشد
        var platformUser = userRows.FirstOrDefault(u =>
            u.IsActive && u.Roles.Any(r => r.Role == AppRole.Platform));
        if (platformUser is not null && PlatformAdminIdentity.IsPlatformAdminMobile(mobile))
        {
            var person = platformUser.Person;
            var key = "__user:" + platformUser.Id.ToString("N");
            return [new OtpIdentityCandidate(key, person.FirstName, person.LastName)];
        }

        var map = new Dictionary<string, OtpIdentityCandidate>(StringComparer.Ordinal);
        var clinic = await clinics.GetCurrentAsync(ct);
        if (clinic is not null)
        {
            var patientRows = await patients.ListByPhoneAsync(mobile, clinic.Id, ct);
            foreach (var p in patientRows)
            {
                var person = p.Person;
                var nid = IranNationalId.Normalize(person.NationalId);
                if (string.IsNullOrWhiteSpace(nid)) continue;
                map[nid] = new OtpIdentityCandidate(nid, person.FirstName, person.LastName);
            }

            // اعضای قرارداد معرفی‌شده — حتی قبل از Admit ادمین
            var memberRows = await contracts.ListActiveMembersByPhoneAsync(clinic.Id, mobile, ct);
            foreach (var m in memberRows)
            {
                var person = m.Person;
                var nid = IranNationalId.Normalize(person.NationalId);
                if (string.IsNullOrWhiteSpace(nid)) continue;
                if (!map.ContainsKey(nid))
                    map[nid] = new OtpIdentityCandidate(nid, person.FirstName, person.LastName);
            }
        }

        foreach (var u in userRows.Where(x => x.IsActive))
        {
            var person = u.Person;
            if (string.IsNullOrWhiteSpace(person.NationalId)) continue;
            var nid = IranNationalId.Normalize(person.NationalId);
            if (string.IsNullOrWhiteSpace(nid)) continue;
            if (!map.ContainsKey(nid))
                map[nid] = new OtpIdentityCandidate(nid, person.FirstName, person.LastName);
        }

        // فقط staff بدون کدملی و بدون بیمار: یک حساب → کاندیدای مصنوعی با NationalId خالی مدیریت در Verify
        if (map.Count == 0)
        {
            var staffOnly = userRows.Where(x => x.IsActive).ToList();
            if (staffOnly.Count == 1)
            {
                var u = staffOnly[0];
                var person = u.Person;
                // کلید ساختگی پایدار برای staff بدون NID — فقط مسیر تک‌کاندیدا
                map["__user:" + u.Id.ToString("N")] =
                    new OtpIdentityCandidate("__user:" + u.Id.ToString("N"), person.FirstName, person.LastName);
            }
        }

        return map.Values.OrderBy(c => c.LastName).ThenBy(c => c.FirstName).ToList();
    }

    private async Task EnsureSoftAdmitForNationalIdAsync(string nationalIdOrKey, CancellationToken ct)
    {
        if (nationalIdOrKey.StartsWith("__user:", StringComparison.Ordinal)) return;
        var nid = IranNationalId.Normalize(nationalIdOrKey);
        if (string.IsNullOrWhiteSpace(nid)) return;
        var clinic = await clinics.GetCurrentAsync(ct);
        if (clinic is null) return;
        var member = await contracts.FindActiveMemberByNationalIdAsync(clinic.Id, nid, ct);
        if (member is null) return;
        // idempotent — همان منطق Admit ادمین
        await patientService.EnsureAdmittedFromMemberAsync(member.Id, ct);
    }

    private async Task MarkMemberLoggedInAsync(string nationalIdOrKey, CancellationToken ct)
    {
        if (nationalIdOrKey.StartsWith("__user:", StringComparison.Ordinal)) return;
        var nid = IranNationalId.Normalize(nationalIdOrKey);
        if (string.IsNullOrWhiteSpace(nid)) return;
        var clinic = await clinics.GetCurrentAsync(ct);
        if (clinic is null) return;
        var member = await contracts.FindActiveMemberByNationalIdAsync(clinic.Id, nid, ct);
        if (member is null) return;
        // قیف: ورود واقعی Owner — Completed را پایین نیاور
        if (member.OnboardingStage is OnboardingStage.Completed or OnboardingStage.Abandoned)
            return;
        if (member.OnboardingStage is OnboardingStage.NotSent or OnboardingStage.SmsSent or OnboardingStage.LinkOpened
            || member.OnboardingStage == OnboardingStage.LoggedIn)
        {
            if (member.OnboardingStage != OnboardingStage.LoggedIn &&
                member.OnboardingStage != OnboardingStage.Completed)
                member.OnboardingStage = OnboardingStage.LoggedIn;
            member.LoggedInAt ??= DateTime.UtcNow;
            member.LastActivityAt = DateTime.UtcNow;
            member.UpdatedAt = DateTime.UtcNow;
        }
    }

    private async Task<User?> ResolveUserForCandidateAsync(string mobile, string nationalIdOrKey, CancellationToken ct)
    {
        if (nationalIdOrKey.StartsWith("__user:", StringComparison.Ordinal))
        {
            var raw = nationalIdOrKey["__user:".Length..];
            if (!Guid.TryParseExact(raw, "N", out var uid)) return null;
            return await users.GetByIdAsync(uid, ct);
        }

        var nid = IranNationalId.Normalize(nationalIdOrKey);
        var user = await users.GetByNationalIdAsync(nid, ct);
        var clinic = await clinics.GetCurrentAsync(ct);
        Patient? patient = null;
        if (clinic is not null)
            patient = await patients.GetByNationalIdAsync(nid, clinic.Id, ct);

        if (user is null && patient is not null)
        {
            user = await users.GetByPersonIdAsync(patient.PersonId, ct);
            if (user is null)
            {
                // حساب ورود به همان Person پرونده — بدون کپی نام روی User
                user = new User
                {
                    PersonId = patient.PersonId,
                    IsActive = true
                };
                await users.AddAsync(user, ct);
                users.AddRole(new UserRoleAssignment
                {
                    UserId = user.Id,
                    Role = AppRole.Owner,
                    ClinicId = clinic!.Id
                });
            }
        }

        if (user is null)
        {
            // staff با NID روی Person ولی بدون Patient
            var byMobile = await users.ListByMobileAsync(mobile, ct);
            user = byMobile.FirstOrDefault(u =>
                u.IsActive &&
                !string.IsNullOrWhiteSpace(u.Person.NationalId) &&
                IranNationalId.Normalize(u.Person.NationalId) == nid);
        }

        if (user is null) return null;

        if (patient is not null)
        {
            // OwnerUserId فقط وقتی Person کاربر و پرونده یکی است
            if (user.PersonId != patient.PersonId)
            {
                user.PersonId = patient.PersonId;
                user.UpdatedAt = DateTime.UtcNow;
            }

            if (patient.OwnerUserId is null)
            {
                patient.OwnerUserId = user.Id;
                patient.UpdatedAt = DateTime.UtcNow;
            }
        }

        var identity = user.Person ?? patient?.Person;
        if (identity is null) return user;
        // هم‌تراز نگه داشتن موبایل Owner با پرونده
        if (patient is not null && !string.Equals(identity.Mobile, mobile, StringComparison.Ordinal))
        {
            identity.Mobile = mobile;
            identity.UpdatedAt = DateTime.UtcNow;
        }

        if (!string.IsNullOrWhiteSpace(nid) && string.IsNullOrWhiteSpace(identity.NationalId))
        {
            identity.NationalId = nid;
            identity.UpdatedAt = DateTime.UtcNow;
        }

        var roles = await users.ListRolesAsync(user.Id, ct);
        if (patient is not null && roles.All(r => r.Role != AppRole.Owner))
            users.AddRole(new UserRoleAssignment { UserId = user.Id, Role = AppRole.Owner, ClinicId = clinic?.Id });

        return user;
    }

    private async Task<User> EnsureSupervisorUserAsync(string mobile, ContractSupervisor supervisor, CancellationToken ct)
    {
        var sp = supervisor.Person;
        // اولویت کدملی تا موبایل مشترک OTP نقش Supervisor را به Owner اشتباه نچسباند
        string? nid = null;
        if (!string.IsNullOrWhiteSpace(sp.NationalId))
        {
            nid = IranNationalId.Normalize(sp.NationalId);
            if (!IranNationalId.IsValid(nid)) nid = null;
        }

        var personId = await EnsureSupervisorPersonIdAsync(mobile, supervisor, sp, nid, ct);

        User? user = null;
        if (nid is not null)
            user = await users.GetByNationalIdAsync(nid, ct);

        if (user is null)
            user = await users.GetByPersonIdAsync(personId, ct);

        if (user is null)
        {
            var byMobile = await users.ListByMobileAsync(mobile, ct);
            // هرگز Owner با NID پر را فقط به‌خاطر موبایل مشترک برنگردان
            user = byMobile.FirstOrDefault(u => u.Roles.Any(r => r.Role == AppRole.Supervisor))
                   ?? byMobile.FirstOrDefault(u =>
                       string.IsNullOrWhiteSpace(u.Person.NationalId)
                       || (nid is not null
                           && string.Equals(IranNationalId.Normalize(u.Person.NationalId), nid, StringComparison.Ordinal)));
        }

        if (user is null)
        {
            user = new User
            {
                PersonId = personId,
                IsActive = true
            };
            await users.AddAsync(user, ct);
        }
        else if (user.PersonId != personId)
        {
            user.PersonId = personId;
            user.UpdatedAt = DateTime.UtcNow;
        }

        var identity = user.Person ?? sp;
        if (!string.Equals(identity.Mobile, mobile, StringComparison.Ordinal))
        {
            identity.Mobile = mobile;
            identity.UpdatedAt = DateTime.UtcNow;
        }

        if (nid is not null && string.IsNullOrWhiteSpace(identity.NationalId))
        {
            identity.NationalId = nid;
            identity.UpdatedAt = DateTime.UtcNow;
        }

        var roles = await users.ListRolesAsync(user.Id, ct);
        if (roles.All(r => r.Role != AppRole.Supervisor || r.ContractId != supervisor.ContractId))
        {
            users.AddRole(new UserRoleAssignment
            {
                UserId = user.Id,
                Role = AppRole.Supervisor,
                ContractId = supervisor.ContractId
            });
        }

        return user;
    }

    private async Task<Guid> EnsureSupervisorPersonIdAsync(
        string mobile,
        ContractSupervisor supervisor,
        Person sp,
        string? nid,
        CancellationToken ct)
    {
        if (supervisor.PersonId != Guid.Empty)
            return supervisor.PersonId;

        var person = new Person
        {
            Mobile = mobile,
            FirstName = string.IsNullOrWhiteSpace(sp.FirstName) ? mobile : sp.FirstName,
            LastName = sp.LastName ?? string.Empty,
            NationalId = nid
        };
        await persons.AddAsync(person, ct);
        return person.Id;
    }

    private async Task<OtpVerifyResult> IssueFullSessionAsync(
        User user, string? deviceLabel, string? appSurface, string? loginMobile, CancellationToken ct)
    {
        user.LastLoginAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;

        var token = NewToken();
        var session = new AuthSession
        {
            UserId = user.Id,
            TokenHash = Hash(token),
            DeviceLabel = string.IsNullOrWhiteSpace(deviceLabel) ? "web" : deviceLabel!,
            AppSurface = string.IsNullOrWhiteSpace(appSurface) ? "clinic_web" : appSurface!,
            LastSeenAt = DateTime.UtcNow,
            PendingSelection = false,
            LoginMobile = string.IsNullOrWhiteSpace(loginMobile) ? null : NormalizeMobile(loginMobile)
        };
        await auth.AddSessionAsync(session, ct);

        var nid = IranNationalId.Normalize(user.Person?.NationalId ?? "");
        if (!string.IsNullOrWhiteSpace(nid))
            await MarkMemberLoggedInAsync(nid, ct);

        await MaybeMultiSessionAlertAsync(user.Id, ct);
        await uow.SaveChangesAsync(ct);
        var roles = (await users.ListRolesAsync(user.Id, ct)).Select(r => r.Role).ToList();
        return new OtpVerifyResult(true, user.Id, session.Id, token, roles, false, null, null);
    }

    private async Task MaybeMultiSessionAlertAsync(Guid userId, CancellationToken ct)
    {
        var active = await auth.ListActiveSessionsAsync(userId, ct);
        // هشدار ضدتقلب وقتی بیش از یک نشست هم‌زمان فعال است
        if (active.Count >= 1)
        {
            await auth.AddMultiSessionAlertAsync(new MultiSessionAlert
            {
                UserId = userId,
                ActiveSessionCount = active.Count + 1,
                ReviewStatus = FraudReviewStatus.Pending
            }, ct);
        }
    }

    private async Task<OtpRequestResult> IssueOtpAsync(string mobile, string purpose, string smsFailMessage, CancellationToken ct)
    {
        var authCfg = authOptions.Value;
        var kav = kavenegarOptions.Value;
        string code;
        string? demoCode = null;

        // بای‌پس: کد ثابت از env — بدون رندم و بدون درگاه پیامک
        // ادمین کل: نمایش = پایه؛ کد واقعی هش‌شده = پایه + ۱ تا با FixedOtp معمولی نشود وارد شد
        if (authCfg.HasFixedOtp)
        {
            var baseCode = authCfg.FixedOtp!.Trim();
            demoCode = baseCode;
            code = PlatformAdminIdentity.IsPlatformAdminMobile(mobile)
                ? PlatformAdminIdentity.IncrementFixedOtp(baseCode)
                : baseCode;
        }
        else
        {
            code = RandomNumberGenerator.GetInt32(10000, 99999).ToString();
            var clinic = await clinics.GetCurrentAsync(ct);
            var provider = clinic?.SmsProvider ?? ClinicSmsProvider.None;
            if (provider == ClinicSmsProvider.None && kav.IsConfigured)
                provider = ClinicSmsProvider.Kavenegar;

            try
            {
                if (provider == ClinicSmsProvider.Touba)
                {
                    var tpl = clinic?.ToubaOtpMessageTemplate?.Trim();
                    if (string.IsNullOrWhiteSpace(tpl))
                        tpl = "کد ورود شما: {code}";
                    var content = tpl.Replace("{code}", code, StringComparison.OrdinalIgnoreCase);
                    await sms.SendPlainAsync(mobile, content, ct);
                }
                else if (provider == ClinicSmsProvider.Kavenegar)
                {
                    var template = FirstNonEmpty(clinic?.KavenegarOtpTemplate, kav.OtpTemplate);
                    if (string.IsNullOrWhiteSpace(template))
                        return new OtpRequestResult(false, null, "قالب OTP کاوه‌نگار پیکربندی نشده است.");
                    await sms.SendTemplateAsync(mobile, template, new[] { code }, ct);
                }
                else
                {
                    return new OtpRequestResult(false, null, "سامانه پیامک کلینیک پیکربندی نشده است.");
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "ارسال OTP برای {Mobile} purpose={Purpose} ناموفق", mobile, purpose);
                return new OtpRequestResult(false, null, smsFailMessage);
            }
        }

        var ttl = 120;
        await auth.AddOtpAsync(new OtpChallenge
        {
            Mobile = mobile,
            Purpose = purpose,
            CodeHash = Hash(code),
            DemoCodePlain = demoCode ?? string.Empty,
            ExpiresAt = DateTime.UtcNow.AddSeconds(ttl)
        }, ct);
        await uow.SaveChangesAsync(ct);
        return new OtpRequestResult(true, demoCode, null);
    }

    private static OtpVerifyResult Fail(string error)
        => new(false, null, null, null, null, false, null, error);

    private static string NewToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

    private static string NormalizeMobile(string mobile) => IranMobile.Normalize(mobile);

    private static string Hash(string value)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes);
    }
}