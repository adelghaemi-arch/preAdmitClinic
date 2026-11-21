/*
 File: backend/src/Nabz.Api/Controllers/ClinicsController.cs
 Description: کلینیک جاری — پروفایل، لوکیشن، تست ارسال پیامک (UC-ADM-23)
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

    /// <summary>UC-ADM-23 — تست درگاه با تنظیمات ذخیره‌شده؛ مستقل از FixedOtp.</summary>
    [Authorize(Roles = "Admin,Platform")]
    [HttpPost("current/sms/test")]
    public async Task<IActionResult> TestSms([FromBody] ClinicSmsTestRequest body, CancellationToken ct)
    {
        try
        {
            return Ok(await clinics.TestSmsAsync(body, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
