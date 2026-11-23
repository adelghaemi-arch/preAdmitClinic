/*
 File: backend/src/Nabz.Api/Controllers/PatientsController.cs
 Description: فهرست/کدملی؛ chart فقط پزشک؛ وضعیت ادمین؛ تغییر موبایل
 Parent Dependencies: IPatientService, CurrentUserExtensions
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nabz.Api.Auth;
using Nabz.Application.Interfaces;

namespace Nabz.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/patients")]
public sealed class PatientsController(IPatientService patients) : ControllerBase
{
    public record UpdatePhoneBody(string Phone);

    public record UpdateHomeBody(
        double HomeLat,
        double HomeLon,
        string HomeAddress,
        string? HomePlaque = null,
        string? HomeUnit = null,
        string? HomePostalCode = null);

    public record UpdateProfileBody(
        string? FirstName = null,
        string? LastName = null,
        string? BirthDate = null,
        bool ClearBirthDate = false,
        string? MaritalStatus = null,
        string? Gender = null,
        double? HomeLat = null,
        double? HomeLon = null,
        string? HomeAddress = null,
        string? HomePlaque = null,
        string? HomeUnit = null,
        string? HomePostalCode = null,
        bool ApplyHome = false);

    [Authorize(Roles = "Specialist,Admin,Platform")]
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] Guid clinicId, [FromQuery] string? q, [FromQuery] int take = 50, CancellationToken ct = default)
        => Ok(await patients.SearchAsync(clinicId, q, take, ct));

    [Authorize(Roles = "Specialist,Admin,Platform")]
    [HttpGet("by-national-id")]
    public async Task<IActionResult> ByNationalId([FromQuery] Guid clinicId, [FromQuery] string nationalId, CancellationToken ct)
    {
        // گیت قرارداد: blocked وقتی کد ملی در هیچ قرارداد فعالی نیست
        var result = await patients.AdmissionLookupByNationalIdAsync(clinicId, nationalId, ct);
        return Ok(result);
    }

    [Authorize(Roles = "Specialist,Admin,Owner,Platform")]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var p = await patients.GetAsync(id, ct);
        return p is null ? NotFound() : Ok(p);
    }

    /// <summary>جزئیات پزشکی پرونده — فقط پزشک.</summary>
    [Authorize(Roles = "Specialist")]
    [HttpGet("{id:guid}/chart")]
    public async Task<IActionResult> Chart(Guid id, CancellationToken ct)
    {
        var chart = await patients.GetChartAsync(id, ct);
        return chart is null ? NotFound() : Ok(chart);
    }

    /// <summary>وضعیت پیش‌پذیرش + شرح برای ادمین — بدون پاسخ فرم.</summary>
    [Authorize(Roles = "Admin,Platform")]
    [HttpGet("{id:guid}/intake-status")]
    public async Task<IActionResult> IntakeStatus(Guid id, CancellationToken ct)
    {
        var s = await patients.GetIntakeStatusAsync(id, ct);
        return s is null ? NotFound() : Ok(s);
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPut("{id:guid}/phone")]
    public async Task<IActionResult> UpdatePhone(Guid id, [FromBody] UpdatePhoneBody body, CancellationToken ct)
    {
        try
        {
            var p = await patients.UpdatePhoneAsync(id, body.Phone, ct);
            return Ok(p);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { ok = false, error = ex.Message });
        }
    }

    [Authorize(Roles = "Owner")]
    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
    {
        var p = await patients.GetForOwnerAsync(User.GetUserId(), ct);
        return p is null ? NotFound() : Ok(p);
    }

    [Authorize(Roles = "Owner")]
    [HttpGet("mine/intake-snapshot")]
    public async Task<IActionResult> IntakeSnapshot(CancellationToken ct)
    {
        var s = await patients.GetOwnerIntakeSnapshotAsync(User.GetUserId(), ct);
        return s is null ? NotFound() : Ok(s);
    }

    /// <summary>UC-OWN-14 — تأیید خوداظهاری ایستگاه مسیر (hold سمت کلاینت).</summary>
    [Authorize(Roles = "Owner")]
    [HttpPost("mine/pathway-stations/{stationDefId:guid}/confirm")]
    public async Task<IActionResult> ConfirmPathwayStation(Guid stationDefId, CancellationToken ct)
    {
        try
        {
            var row = await patients.ConfirmPathwayStationAsync(User.GetUserId(), stationDefId, ct);
            return Ok(row);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { ok = false, error = ex.Message });
        }
    }

    /// <summary>به‌روزرسانی آدرس/مختصات منزل — فقط مالک پرونده (با سوابق).</summary>
    [Authorize(Roles = "Owner")]
    [HttpPut("{id:guid}/home")]
    public async Task<IActionResult> UpdateHome(Guid id, [FromBody] UpdateHomeBody body, CancellationToken ct)
    {
        try
        {
            var p = await patients.UpdateHomeAddressAsync(
                id,
                User.GetUserId(),
                new UpdatePatientHomeAddressRequest(
                    body.HomeLat,
                    body.HomeLon,
                    body.HomeAddress,
                    body.HomePlaque,
                    body.HomeUnit,
                    body.HomePostalCode),
                ct);
            return Ok(p);
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

    [Authorize(Roles = "Owner")]
    [HttpPut("mine/profile")]
    public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateProfileBody body, CancellationToken ct)
    {
        try
        {
            var p = await patients.UpdateMyProfileAsync(User.GetUserId(), ToProfileRequest(body, allowGender: false), ct);
            return Ok(p);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { ok = false, error = ex.Message });
        }
    }

    /// <summary>رد مقدمهٔ مسیر پیش‌پذیرش — persist روی سرور.</summary>
    [Authorize(Roles = "Owner")]
    [HttpPost("mine/journey-intro-seen")]
    public async Task<IActionResult> DismissJourneyIntro(CancellationToken ct)
    {
        try
        {
            var p = await patients.DismissJourneyIntroAsync(User.GetUserId(), ct);
            return Ok(p);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { ok = false, error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPut("{id:guid}/profile")]
    public async Task<IActionResult> UpdateProfile(Guid id, [FromBody] UpdateProfileBody body, CancellationToken ct)
    {
        try
        {
            var p = await patients.UpdateProfileAsync(id, User.GetUserId(), ToProfileRequest(body, allowGender: true), allowGender: true, ct);
            return Ok(p);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { ok = false, error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpGet("{id:guid}/profile-revisions")]
    public async Task<IActionResult> ProfileRevisions(Guid id, [FromQuery] int take = 100, CancellationToken ct = default)
        => Ok(await patients.ListProfileRevisionsAsync(id, take, ct));

    private static UpdatePatientProfileRequest ToProfileRequest(UpdateProfileBody body, bool allowGender)
    {
        DateOnly? birth = null;
        if (!string.IsNullOrWhiteSpace(body.BirthDate))
        {
            if (!DateOnly.TryParse(
                    body.BirthDate,
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None,
                    out var d))
                throw new InvalidOperationException("تاریخ تولد نامعتبر است.");
            birth = d;
        }
        return new UpdatePatientProfileRequest(
            body.FirstName,
            body.LastName,
            birth,
            body.MaritalStatus,
            allowGender ? body.Gender : null,
            body.ClearBirthDate,
            body.HomeLat,
            body.HomeLon,
            body.HomeAddress,
            body.HomePlaque,
            body.HomeUnit,
            body.HomePostalCode,
            body.ApplyHome);
    }
}
