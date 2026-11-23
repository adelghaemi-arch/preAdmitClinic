/*
 File: backend/src/Nabz.Api/Controllers/ClinicStationsController.cs
 Description: کاتالوگ ایستگاه کلینیک جاری — Admin/Platform mutate؛ Specialist خواندن فعال (UC-ADM-25)
 Parent Dependencies: IClinicStationService
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nabz.Application.Interfaces;

namespace Nabz.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/clinics/current/stations")]
public sealed class ClinicStationsController(IClinicStationService stations) : ControllerBase
{
    public record SetActiveBody(bool IsActive);

    [Authorize(Roles = "Admin,Platform,Specialist")]
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool activeOnly = false, CancellationToken ct = default)
    {
        // پزشک فقط ایستگاه‌های فعال را برای «افزودن فوری» می‌بیند
        var onlyActive = activeOnly
            || (User.IsInRole("Specialist") && !User.IsInRole("Admin") && !User.IsInRole("Platform"));
        return Ok(await stations.ListCurrentAsync(onlyActive, ct));
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UpsertClinicStationRequest body, CancellationToken ct)
    {
        try
        {
            return Ok(await stations.CreateAsync(body, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertClinicStationRequest body, CancellationToken ct)
    {
        try
        {
            return Ok(await stations.UpdateAsync(id, body, ct));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPut("{id:guid}/active")]
    public async Task<IActionResult> SetActive(Guid id, [FromBody] SetActiveBody body, CancellationToken ct)
    {
        try
        {
            return Ok(await stations.SetActiveAsync(id, body.IsActive, ct));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
