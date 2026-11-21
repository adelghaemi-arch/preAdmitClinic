/*
 File: backend/src/Nabz.Api/Controllers/SmsTemplatesController.cs
 Description: فهرست قالب‌های پیامک گروهی برای انتخاب در قیف (Admin/Platform/Supervisor)
 Parent Dependencies: ISmsCampaignTemplateService
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nabz.Application.Interfaces;

namespace Nabz.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Platform,Supervisor")]
[Route("api/sms-templates")]
public sealed class SmsTemplatesController(ISmsCampaignTemplateService templates) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool activeOnly = true, CancellationToken ct = default)
        => Ok(await templates.ListAsync(activeOnly, ct));
}
