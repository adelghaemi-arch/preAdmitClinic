/*
 File: backend/src/Nabz.Api/Controllers/ContractsController.cs
 Description: قرارداد سازمانی؛ Platform⊇Admin برای mutate کلینیک؛ ناظر فقط قرارداد خود
 Parent Dependencies: IContractService, IPatientService, CurrentUserExtensions
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nabz.Api.Auth;
using Nabz.Application.Common;
using Nabz.Application.Interfaces;

namespace Nabz.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/contracts")]
public sealed class ContractsController(IContractService contracts, IPatientService patients) : ControllerBase
{
    [Authorize(Roles = "Admin,Supervisor,Platform")]
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid clinicId, CancellationToken ct)
    {
        var list = await contracts.ListByClinicAsync(clinicId, ct);
        // ناظر فقط قرارداد خودش را می‌بیند (ادمین/پلتفرم همهٔ کلینیک)
        if (User.IsInRole("Supervisor") && !User.IsInRole("Admin") && !User.IsInRole("Platform"))
        {
            var cid = User.GetContractId();
            list = list.Where(c => c.Id == cid).ToList();
        }
        return Ok(list);
    }

    [Authorize(Roles = "Admin,Supervisor,Platform")]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        if (User.IsInRole("Supervisor") && !User.IsInRole("Admin") && !User.IsInRole("Platform") && User.GetContractId() != id)
            return Forbid();
        var c = await contracts.GetAsync(id, ct);
        return c is null ? NotFound() : Ok(c);
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPost]
    public async Task<IActionResult> Create([FromQuery] Guid clinicId, [FromBody] CreateContractRequest body, CancellationToken ct)
        => Ok(await contracts.CreateAsync(clinicId, body, ct));

    // مشخصات پایه (عنوان/سازمان/بسته پیش‌فرض)؛ Code قفل؛ API و ناظر مسیر جدا دارند
    [Authorize(Roles = "Admin,Platform")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateContractRequest body, CancellationToken ct)
        => Ok(await contracts.UpdateAsync(id, body, ct));

    [Authorize(Roles = "Admin,Platform")]
    [HttpPut("{id:guid}/supervisor")]
    public async Task<IActionResult> Supervisor(Guid id, [FromBody] UpdateSupervisorRequest body, CancellationToken ct)
    {
        await contracts.UpdateSupervisorAsync(id, body, ct);
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPost("{id:guid}/members/import")]
    public async Task<IActionResult> Import(Guid id, [FromBody] List<ImportMemberRequest> body, CancellationToken ct)
    {
        var result = await contracts.ImportMembersAsync(id, body, ct);
        return Ok(new
        {
            ok = true,
            imported = result.Imported,
            duplicates = result.Duplicates,
            rejected = result.Rejected,
            results = result.Results
        });
    }

    // Platform هم برای hydrate workspace / دراپ‌داون ناظر members می‌خواند (مثل List)
    [Authorize(Roles = "Admin,Supervisor,Platform")]
    [HttpGet("{id:guid}/members")]
    public async Task<IActionResult> Members(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = Paging.DefaultPageSize,
        [FromQuery] string? q = null,
        [FromQuery] bool all = false,
        CancellationToken ct = default)
    {
        // ناظر خالص فقط قرارداد خودش؛ Admin/Platform از چک ContractId مستثنی
        if (User.IsInRole("Supervisor") && !User.IsInRole("Admin") && !User.IsInRole("Platform")
            && User.GetContractId() != id)
            return Forbid();
        // all=true فقط برای عملیات گروهی (SMS) — UI لیست همیشه صفحه‌بندی می‌شود
        if (all)
            return Ok(await contracts.ListMembersAsync(id, ct));
        return Ok(await contracts.ListMembersPagedAsync(id, page, pageSize, q, ct));
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPut("{id:guid}/api")]
    public async Task<IActionResult> UpdateApi(Guid id, [FromBody] ApiBody body, CancellationToken ct)
    {
        await contracts.UpdateApiAsync(id, body.ApiEndpoint, body.ApiKey, ct);
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "Admin,Supervisor,Platform")]
    [HttpPost("{id:guid}/sms")]
    public async Task<IActionResult> Sms(Guid id, [FromBody] SmsBody body, CancellationToken ct)
    {
        // ناظر خالص؛ Admin/Platform مثل ادمین کلینیک
        var asSupervisor = User.IsInRole("Supervisor") && !User.IsInRole("Admin") && !User.IsInRole("Platform");
        if (asSupervisor && User.GetContractId() != id)
            return Forbid();
        if (body.TemplateId == Guid.Empty)
            return BadRequest(new { error = "انتخاب قالب پیامک الزامی است." });
        try
        {
            var sent = await contracts.SendBulkSmsAsync(id, body.TemplateId, body.CampaignTitle, body.MemberIds, User.GetUserId(), asSupervisor, ct);
            return Ok(new { ok = true, sent });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPut("members/{memberId:guid}")]
    public async Task<IActionResult> UpdateMember(Guid memberId, [FromBody] ImportMemberRequest body, CancellationToken ct)
    {
        try
        {
            return Ok(await contracts.UpdateMemberAsync(memberId, body, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpDelete("members/{memberId:guid}")]
    public async Task<IActionResult> DeleteMember(Guid memberId, CancellationToken ct)
    {
        try
        {
            await contracts.DeleteMemberAsync(memberId, ct);
            return Ok(new { ok = true });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPut("members/{memberId:guid}/pathway")]
    public async Task<IActionResult> OverridePathway(Guid memberId, [FromBody] PathwayOverrideBody body, CancellationToken ct)
    {
        await contracts.OverrideMemberPathwayAsync(memberId, body.PathwayCode, body.PathwayTitle, ct);
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPut("members/{memberId:guid}/onboarding")]
    public async Task<IActionResult> Onboarding(Guid memberId, [FromBody] UpdateOnboardingRequest body, CancellationToken ct)
    {
        await contracts.UpdateMemberOnboardingAsync(memberId, body, ct);
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPost("members/{memberId:guid}/admit")]
    public async Task<IActionResult> Admit(Guid memberId, CancellationToken ct)
        => Ok(await patients.AdmitContractMemberAsync(memberId, ct));

    [Authorize(Roles = "Admin,Platform")]
    [HttpPut("{id:guid}/pathway-rules")]
    public async Task<IActionResult> PathwayRules(
        Guid id,
        [FromBody] List<PathwayRuleBody> body,
        [FromQuery] bool reapplyMembers = true,
        CancellationToken ct = default)
    {
        // reapplyMembers=false برای جابه‌جایی فقط‌اولویت؛ اعضا با recheck جابه‌جا می‌شوند
        var result = await contracts.SavePathwayRulesAsync(id, body.Select(r =>
            new PathwayRuleInput(r.Title, r.Gender, r.MinAge, r.MaxAge, r.JobCategory, r.PathwayCode, r.Priority, r.LibraryRuleId)).ToList(), reapplyMembers, ct);
        return Ok(new { ok = true, recalculated = result.Recalculated, needsManual = result.NeedsManual });
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPost("{id:guid}/pathway-rules/attach")]
    public async Task<IActionResult> AttachPathwayLibrary(Guid id, [FromBody] AttachPathwayLibraryBody body, CancellationToken ct)
    {
        try
        {
            var result = await contracts.AttachLibraryRulesAsync(id, body.LibraryRuleIds ?? [], ct);
            return Ok(new { ok = true, recalculated = result.Recalculated, needsManual = result.NeedsManual });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpDelete("{id:guid}/pathway-rules/{ruleId:guid}")]
    public async Task<IActionResult> DetachPathwayRule(Guid id, Guid ruleId, CancellationToken ct)
    {
        try
        {
            var result = await contracts.DetachPathwayRuleAsync(id, ruleId, ct);
            return Ok(new { ok = true, recalculated = result.Recalculated, needsManual = result.NeedsManual });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPost("{id:guid}/pathway-rules/recheck-preview")]
    public async Task<IActionResult> PathwayRecheckPreview(Guid id, CancellationToken ct)
    {
        try
        {
            return Ok(await contracts.PreviewPathwayRecheckAsync(id, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPost("{id:guid}/pathway-rules/recheck-apply")]
    public async Task<IActionResult> PathwayRecheckApply(Guid id, [FromBody] PathwayRecheckApplyRequest body, CancellationToken ct)
    {
        try
        {
            var result = await contracts.ApplyPathwayRecheckAsync(id, body.MemberIds ?? [], ct);
            return Ok(new { ok = true, applied = result.Applied, skipped = result.Skipped });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin,Supervisor,Platform")]
    [HttpGet("{id:guid}/funnel")]
    public async Task<IActionResult> Funnel(Guid id, CancellationToken ct)
    {
        if (User.IsInRole("Supervisor") && !User.IsInRole("Admin") && !User.IsInRole("Platform")
            && User.GetContractId() != id)
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

    public record SmsBody(Guid TemplateId, string? CampaignTitle, List<Guid>? MemberIds);
    public record ApiBody(string? ApiEndpoint, string? ApiKey);
    public record PathwayOverrideBody(string PathwayCode, string PathwayTitle);
    public record PathwayRuleBody(string Title, string Gender, int? MinAge, int? MaxAge, string JobCategory, string PathwayCode, int Priority, Guid? LibraryRuleId = null);
    public record AttachPathwayLibraryBody(List<Guid>? LibraryRuleIds);
}
