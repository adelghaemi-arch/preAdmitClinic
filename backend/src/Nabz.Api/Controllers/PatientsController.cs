/*
 File: backend/src/Nabz.Api/Controllers/PatientsController.cs
 Description: فهرست/جستجو/کدملی و پرونده مالک از claim
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
    [Authorize(Roles = "Specialist,Admin")]
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

    [Authorize(Roles = "Specialist,Admin,Platform")]
    [HttpGet("{id:guid}/chart")]
    public async Task<IActionResult> Chart(Guid id, CancellationToken ct)
    {
        var chart = await patients.GetChartAsync(id, ct);
        return chart is null ? NotFound() : Ok(chart);
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
}
