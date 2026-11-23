/*
 File: backend/src/Nabz.Api/Controllers/ClinicsController.cs
 Description: کلینیک جاری — پروفایل، لوگو، تست پیامک و حساب طوبی (UC-ADM-21/23)
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

    /// <summary>UC-ADM-21 — آپلود لوگوی بیمارستان.</summary>
    [Authorize(Roles = "Admin,Platform")]
    [HttpPost("current/logo")]
    [RequestSizeLimit(3_000_000)]
    public async Task<IActionResult> UploadLogo(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { ok = false, error = "فایل لوگو خالی است." });
        try
        {
            await using var stream = file.OpenReadStream();
            var result = await clinics.UploadLogoAsync(stream, file.FileName, file.ContentType, ct);
            return Ok(new { ok = true, logoStorageKey = result.LogoStorageKey, fileName = result.FileName, contentType = result.ContentType, sizeBytes = result.SizeBytes });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { ok = false, error = ex.Message });
        }
    }

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

    /// <summary>UC-ADM-21 — اعتبار و خطوط ارسال از UserInfo طوبی.</summary>
    [Authorize(Roles = "Admin,Platform")]
    [HttpGet("current/sms/touba-account")]
    public async Task<IActionResult> ToubaAccount(CancellationToken ct)
    {
        try
        {
            return Ok(await clinics.GetToubaAccountInfoAsync(ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
