/*
 File: backend/src/Nabz.Api/Controllers/ClinicsController.cs
 Description: خواندن کلینیک جاری برای کلاینت احرازشده
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
}
