/*
 File: backend/src/Nabz.Api/Controllers/ContractsController.cs
 Description: قرارداد سازمانی؛ SMS با نقش از claim نه AsSupervisor کلاینت
 Parent Dependencies: IContractService, IPatientService, CurrentUserExtensions
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nabz.Api.Auth;
using Nabz.Application.Interfaces;

namespace Nabz.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/contracts")]
public sealed class ContractsController(IContractService contracts, IPatientService patients) : ControllerBase
{
    [Authorize(Roles = "Admin,Supervisor")]
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid clinicId, CancellationToken ct)
    {
        var list = await contracts.ListByClinicAsync(clinicId, ct);
        // ناظر فقط قرارداد خودش را می‌بیند
        if (User.IsInRole("Supervisor"))
        {
            var cid = User.GetContractId();
            list = list.Where(c => c.Id == cid).ToList();
        }
        return Ok(list);
    }

    [Authorize(Roles = "Admin,Supervisor")]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        if (User.IsInRole("Supervisor") && User.GetContractId() != id)
            return Forbid();
        var c = await contracts.GetAsync(id, ct);
        return c is null ? NotFound() : Ok(c);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromQuery] Guid clinicId, [FromBody] CreateContractRequest body, CancellationToken ct)
        => Ok(await contracts.CreateAsync(clinicId, body, ct));

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}/supervisor")]
    public async Task<IActionResult> Supervisor(Guid id, [FromBody] UpdateSupervisorRequest body, CancellationToken ct)
    {
        await contracts.UpdateSupervisorAsync(id, body, ct);
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("{id:guid}/members/import")]
    public async Task<IActionResult> Import(Guid id, [FromBody] List<ImportMemberRequest> body, CancellationToken ct)
        => Ok(new { ok = true, imported = await contracts.ImportMembersAsync(id, body, ct) });

    [Authorize(Roles = "Admin,Supervisor")]
    [HttpGet("{id:guid}/members")]
    public async Task<IActionResult> Members(Guid id, CancellationToken ct)
    {
        if (User.IsInRole("Supervisor") && User.GetContractId() != id)
            return Forbid();
        return Ok(await contracts.ListMembersAsync(id, ct));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}/api")]
    public async Task<IActionResult> UpdateApi(Guid id, [FromBody] ApiBody body, CancellationToken ct)
    {
        await contracts.UpdateApiAsync(id, body.ApiEndpoint, body.ApiKey, ct);
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "Admin,Supervisor")]
    [HttpPost("{id:guid}/sms")]
    public async Task<IActionResult> Sms(Guid id, [FromBody] SmsBody body, CancellationToken ct)
    {
        var asSupervisor = User.IsInRole("Supervisor");
        if (asSupervisor && User.GetContractId() != id)
            return Forbid();
        var sent = await contracts.SendBulkSmsAsync(id, body.CampaignTitle, body.MemberIds, User.GetUserId(), asSupervisor, ct);
        return Ok(new { ok = true, sent });
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("members/{memberId:guid}/package")]
    public async Task<IActionResult> OverridePackage(Guid memberId, [FromBody] PackageOverrideBody body, CancellationToken ct)
    {
        await contracts.OverrideMemberPackageAsync(memberId, body.PackageCode, body.PackageTitle, ct);
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("members/{memberId:guid}/onboarding")]
    public async Task<IActionResult> Onboarding(Guid memberId, [FromBody] UpdateOnboardingRequest body, CancellationToken ct)
    {
        await contracts.UpdateMemberOnboardingAsync(memberId, body, ct);
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("members/{memberId:guid}/admit")]
    public async Task<IActionResult> Admit(Guid memberId, CancellationToken ct)
        => Ok(await patients.AdmitContractMemberAsync(memberId, ct));

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}/package-rules")]
    public async Task<IActionResult> PackageRules(Guid id, [FromBody] List<PackageRuleBody> body, CancellationToken ct)
    {
        await contracts.SavePackageRulesAsync(id, body.Select(r => (r.Title, r.Gender, r.MinAge, r.MaxAge, r.JobCategory, r.PackageCode, r.Priority)).ToList(), ct);
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "Admin,Supervisor")]
    [HttpGet("{id:guid}/funnel")]
    public async Task<IActionResult> Funnel(Guid id, CancellationToken ct)
    {
        if (User.IsInRole("Supervisor") && User.GetContractId() != id)
            return Forbid();
        return Ok(await contracts.GetFunnelStatsAsync(id, ct));
    }

    [AllowAnonymous]
    [HttpGet("members/by-invite")]
    public async Task<IActionResult> ByInvite([FromQuery] string token, CancellationToken ct)
    {
        var m = await contracts.GetMemberByInviteTokenAsync(token, ct);
        return m is null ? NotFound() : Ok(m);
    }

    public record SmsBody(string CampaignTitle, List<Guid>? MemberIds);
    public record ApiBody(string? ApiEndpoint, string? ApiKey);
    public record PackageOverrideBody(string PackageCode, string PackageTitle);
    public record PackageRuleBody(string Title, string Gender, int? MinAge, int? MaxAge, string JobCategory, string PackageCode, int Priority);
}
