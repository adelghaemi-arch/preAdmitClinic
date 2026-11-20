/*
 File: backend/src/Nabz.Api/Controllers/ClinicsController.cs
 Description: خواندن کلینیک جاری و به‌روزرسانی نام/لوکیشن توسط ادمین
 Parent Dependencies: IClinicService
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nabz.Application.Interfaces;

namespace Nabz.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/clinics")]
public sealed class ClinicsController(IClinicService clinics) : ControllerBase
{
    [HttpGet("current")]
    public async Task<IActionResult> Current(CancellationToken ct)
    {
        var c = await clinics.GetCurrentAsync(ct);
        return c is null ? NotFound() : Ok(c);
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPut("current")]
    public async Task<IActionResult> UpdateCurrent([FromBody] UpdateClinicRequest body, CancellationToken ct)
        => Ok(await clinics.UpdateCurrentAsync(body, ct));
}
