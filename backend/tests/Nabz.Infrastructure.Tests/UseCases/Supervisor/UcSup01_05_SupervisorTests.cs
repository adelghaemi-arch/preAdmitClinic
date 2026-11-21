/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Supervisor/UcSup01_05_SupervisorTests.cs
 Description: UC-SUP-01 تا 05 — OTP ناظر، funnel، SMS، revoke
 Parent Dependencies: ServiceHarness
 */

using Nabz.Application.Interfaces;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;
using Nabz.Infrastructure.Tests.Support;

namespace Nabz.Infrastructure.Tests.UseCases.Supervisor;

public sealed class UcSup01_05_SupervisorTests
{
    private const string FixedOtp = "12345";
    private const string SupervisorPhone = "09127778888";

    [Fact]
    [Trait("UC", "UC-SUP-01")]
    public async Task UC_SUP_01_HappyPath_OtpGrantsSupervisorRole()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService(FixedOtp);
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", "SUP-1"));
        await contracts.UpdateSupervisorAsync(created.Id,
            new UpdateSupervisorRequest("ناظر", "ناظر", SupervisorPhone, null, null, true));

        var auth = h.CreateAuthService(FixedOtp);
        await auth.RequestOtpAsync(SupervisorPhone);
        var verify = await auth.VerifyOtpAsync(SupervisorPhone, FixedOtp, "web", "supervisor");

        Assert.True(verify.Ok);
        Assert.Contains(AppRole.Supervisor, verify.Roles!);
        Assert.Empty(h.Sms.SentCalls);
    }

    /// <summary>Nx: موبایل غیرناظر — OTP رد.</summary>
    [Fact]
    [Trait("UC", "UC-SUP-01")]
    public async Task UC_SUP_01_Nx_UnknownSupervisorPhone_Fails()
    {
        var h = new ServiceHarness();
        h.SeedClinic();
        var auth = h.CreateAuthService(FixedOtp);

        var request = await auth.RequestOtpAsync("09998887777");

        Assert.False(request.Ok);
    }

    [Fact]
    [Trait("UC", "UC-SUP-03")]
    public async Task UC_SUP_03_HappyPath_ListMembers()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService();
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));
        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو", "تست", "0010000003", "09120002001", new DateOnly(1986, 1, 1), "مرد", null, null, null, null)
        ]);

        var members = await contracts.ListMembersAsync(created.Id);

        Assert.Single(members);
    }

    [Fact]
    [Trait("UC", "UC-SUP-04")]
    public async Task UC_SUP_04_HappyPath_BulkSmsAsSupervisor_FixedOtp()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var contracts = h.CreateContractService(FixedOtp);
        var created = await contracts.CreateAsync(clinicId, new CreateContractRequest("قرارداد", "سازمان", null));
        await contracts.UpdateSupervisorAsync(created.Id,
            new UpdateSupervisorRequest("ناظر", "ناظر", SupervisorPhone, null, null, true));
        await contracts.ImportMembersAsync(created.Id,
        [
            new ImportMemberRequest("عضو", "تست", "0013542419", "09120002002", new DateOnly(1985, 1, 1), "زن", null, null, null, null)
        ]);

        var templateId = h.SeedDefaultSmsTemplate();
        var sent = await contracts.SendBulkSmsAsync(created.Id, templateId, "یادآوری", null, Guid.NewGuid(), asSupervisor: true);

        Assert.Equal(1, sent);
        Assert.Empty(h.Sms.SentCalls);
    }

    [Fact]
    [Trait("UC", "UC-SUP-05")]
    public async Task UC_SUP_05_HappyPath_RevokeSession()
    {
        var h = new ServiceHarness();
        var clinicId = h.SeedClinic();
        var (_, owner) = h.SeedPatient(clinicId, SupervisorPhone);
        var session = new AuthSession { UserId = owner.Id, TokenHash = "s-hash" };
        h.Store.Sessions.Add(session);
        var auth = h.CreateAuthService(FixedOtp);

        var ok = await auth.RevokeSessionAsync(session.Id, owner.Id, allowOtherUsers: false);

        Assert.True(ok);
    }
}