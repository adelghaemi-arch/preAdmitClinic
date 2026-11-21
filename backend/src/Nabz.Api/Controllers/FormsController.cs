/*
 File: backend/src/Nabz.Api/Controllers/FormsController.cs
 Description: فرم پیش‌پذیرش، ساختار، resolve، draft/submit؛ SaveResponse با retry یک‌بار روی concurrency
 Parent Dependencies: IFormService, CurrentUserExtensions
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nabz.Api.Auth;
using Nabz.Application.Interfaces;
using Nabz.Domain.Enums;

namespace Nabz.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/forms")]
public sealed class FormsController(
    IFormService forms,
    IServiceScopeFactory scopes,
    ILogger<FormsController> log) : ControllerBase
{
    [Authorize(Roles = "Admin,Specialist,Owner,Platform")]
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid clinicId, CancellationToken ct)
        => Ok(await forms.ListFormsAsync(clinicId, ct));

    [Authorize(Roles = "Admin,Specialist,Owner,Platform")]
    [HttpGet("structures")]
    public async Task<IActionResult> ListStructures([FromQuery] Guid clinicId, CancellationToken ct)
        => Ok(await forms.ListStructuresAsync(clinicId, ct));

    [Authorize(Roles = "Admin,Platform")]
    [HttpGet("package")]
    public async Task<IActionResult> ExportPackage([FromQuery] Guid clinicId, CancellationToken ct)
        => Ok(await forms.ExportPackageAsync(clinicId, ct));

    [Authorize(Roles = "Admin,Platform")]
    [HttpPost("package")]
    public async Task<IActionResult> ImportPackage([FromQuery] Guid clinicId, [FromBody] FormPackageDto body, CancellationToken ct)
        => Ok(await forms.ImportPackageAsync(clinicId, body, ct));

    [Authorize(Roles = "Admin,Platform")]
    [HttpGet("package.xlsx")]
    public async Task<IActionResult> ExportPackageExcel([FromQuery] Guid clinicId, CancellationToken ct)
    {
        var bytes = await forms.ExportPackageExcelAsync(clinicId, ct);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "form-package.xlsx");
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPost("package.xlsx")]
    public async Task<IActionResult> ImportPackageExcel([FromQuery] Guid clinicId, IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { ok = false, error = "فایل Excel الزامی است." });
        await using var stream = file.OpenReadStream();
        return Ok(await forms.ImportPackageExcelAsync(clinicId, stream, ct));
    }

    [Authorize(Roles = "Admin,Specialist,Owner,Platform")]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetStructure(Guid id, CancellationToken ct)
    {
        var f = await forms.GetStructureAsync(id, ct);
        return f is null ? NotFound() : Ok(f);
    }

    [Authorize(Roles = "Owner,Admin,Specialist,Platform")]
    [HttpGet("{id:guid}/resolve")]
    public async Task<IActionResult> Resolve(Guid id, [FromQuery] Guid patientId, CancellationToken ct)
        => Ok(await forms.ResolveForPatientAsync(id, patientId, ct));

    [Authorize(Roles = "Admin,Platform")]
    [HttpPost]
    public async Task<IActionResult> Upsert([FromQuery] Guid clinicId, [FromBody] UpsertFormBody body, CancellationToken ct)
        => Ok(await forms.UpsertFormAsync(clinicId, body.FormId, body.Code, body.Title, body.WarningText, body.TargetAudienceJson ?? "{}", ct));

    [Authorize(Roles = "Admin,Platform")]
    [HttpPut("{id:guid}/structure")]
    public async Task<IActionResult> UpsertStructure(Guid id, [FromBody] StructureBody body, CancellationToken ct)
    {
        await forms.UpsertStructureAsync(id, body.Sections, body.Items, ct);
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPost("{id:guid}/publish")]
    public async Task<IActionResult> Publish(Guid id, CancellationToken ct)
    {
        await forms.PublishFormAsync(id, ct);
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPost("{id:guid}/reorder-items")]
    public async Task<IActionResult> Reorder(Guid id, [FromBody] List<ReorderItem> body, CancellationToken ct)
    {
        await forms.ReorderItemsAsync(id, body.Select(x => (x.ItemId, x.SortOrder)).ToList(), ct);
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "Owner")]
    [HttpPost("responses")]
    public async Task<IActionResult> SaveResponse([FromBody] SaveResponseBody body, CancellationToken ct)
    {
        // answers null → ۴۰۰ خوانا؛ استثنای دامنه نباید ۵۰۰ بدون CORS شود
        if (body.Answers is null)
            return BadRequest(new { ok = false, error = "فهرست پاسخ‌ها الزامی است." });

        var status = body.Submit ? FormResponseStatus.Submitted : FormResponseStatus.Draft;
        var userId = User.GetUserId();
        try
        {
            var r = await forms.SaveResponseAsync(body.PatientId, body.FormId, status, body.Answers, userId, ct);
            return Ok(r);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { ok = false, error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { ok = false, error = ex.Message });
        }
        catch (DbUpdateConcurrencyException ex)
        {
            log.LogWarning(
                ex,
                "FormResponse concurrency patient={PatientId} form={FormId} entries={Entries}; retry once",
                body.PatientId,
                body.FormId,
                string.Join(",", ex.Entries.Select(e => $"{e.Metadata.ClrType.Name}:{e.State}")));
            // DbContext آلوده است؛ یک بار با scope تازه
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var retry = scope.ServiceProvider.GetRequiredService<IFormService>();
                var r = await retry.SaveResponseAsync(body.PatientId, body.FormId, status, body.Answers, userId, ct);
                return Ok(r);
            }
            catch (DbUpdateConcurrencyException ex2)
            {
                log.LogWarning(
                    ex2,
                    "FormResponse concurrency exhausted patient={PatientId} form={FormId} entries={Entries}",
                    body.PatientId,
                    body.FormId,
                    string.Join(",", ex2.Entries.Select(e => $"{e.Metadata.ClrType.Name}:{e.State}")));
                return Conflict(new { ok = false, error = "ذخیره هم‌زمان تداخل داشت؛ دوباره تلاش کنید." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { ok = false, error = "ذخیره پاسخ ناموفق بود؛ دوباره تلاش کنید." });
            }
            catch (InvalidOperationException ex2)
            {
                return BadRequest(new { ok = false, error = ex2.Message });
            }
            catch (UnauthorizedAccessException ex2)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { ok = false, error = ex2.Message });
            }
        }
        catch (DbUpdateException)
        {
            return Conflict(new { ok = false, error = "ذخیره پاسخ ناموفق بود؛ دوباره تلاش کنید." });
        }
    }

    // فقط پزشک جزئیات پاسخ پزشکی را می‌بیند
    [Authorize(Roles = "Specialist")]
    [HttpGet("responses")]
    public async Task<IActionResult> GetResponseSpecialist([FromQuery] Guid patientId, [FromQuery] Guid formId, CancellationToken ct)
    {
        var r = await forms.GetResponseForSpecialistAsync(patientId, formId, ct);
        return r is null ? NotFound(new { ok = false, incomplete = true }) : Ok(r);
    }

    [Authorize(Roles = "Owner")]
    [HttpGet("responses/mine")]
    public async Task<IActionResult> GetResponseOwner([FromQuery] Guid patientId, [FromQuery] Guid formId, CancellationToken ct)
    {
        try
        {
            var r = await forms.GetResponseForOwnerAsync(patientId, formId, User.GetUserId(), ct);
            return r is null ? NotFound() : Ok(r);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { ok = false, error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { ok = false, error = ex.Message });
        }
    }

    public record UpsertFormBody(Guid? FormId, string Code, string Title, string? WarningText, string? TargetAudienceJson);
    public record StructureBody(List<FormSectionUpsert> Sections, List<FormItemUpsert> Items);
    public record ReorderItem(Guid ItemId, int SortOrder);
    public record SaveResponseBody(Guid PatientId, Guid FormId, bool Submit, List<FormAnswerInput> Answers);
}
