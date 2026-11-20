/*
 File: backend/src/Nabz.Api/Controllers/UsersController.cs
 Description: مدیریت کاربران برای ادمین کل و ادمین کلینیک (فیلتر Platform)
 Parent Dependencies: IUserAdminService
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nabz.Api.Auth;
using Nabz.Application.Interfaces;
using Nabz.Domain.Enums;

namespace Nabz.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Platform")]
[Route("api/users")]
public sealed class UsersController(IUserAdminService userAdmin) : ControllerBase
{
    [HttpGet("assignable-roles")]
    public IActionResult AssignableRoles()
        => Ok(userAdmin.ListAssignableRoles(IsPlatformAdmin()).Select(r => r.ToString()).ToList());

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
        => Ok(await userAdmin.ListUsersAsync(IsPlatformAdmin(), ct));

    [HttpPost]
    public async Task<IActionResult> Upsert([FromBody] UpsertUserBody body, CancellationToken ct)
    {
        try
        {
            var dto = await userAdmin.UpsertUserAsync(
                IsPlatformAdmin(),
                body.UserId,
                body.FullName,
                body.Mobile,
                body.NationalId,
                body.PrimaryRole,
                body.ClinicId,
                body.ContractId,
                ActorName(),
                ct);
            return Ok(dto);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("یافت نشد"))
        {
            return NotFound(new { ok = false, error = ex.Message });
        }
    }

    [HttpPost("{userId:guid}/active")]
    public async Task<IActionResult> SetActive(Guid userId, [FromBody] ActiveBody body, CancellationToken ct)
    {
        try
        {
            await userAdmin.SetUserActiveAsync(IsPlatformAdmin(), userId, body.IsActive, ActorName(), ct);
            return Ok(new { ok = true });
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("یافت نشد"))
        {
            return NotFound(new { ok = false, error = ex.Message });
        }
    }

    private bool IsPlatformAdmin() => User.IsInRole(nameof(AppRole.Platform));
    private string ActorName() => User.GetUserId().ToString();

    public record UpsertUserBody(Guid? UserId, string FullName, string Mobile, string? NationalId, AppRole PrimaryRole, Guid? ClinicId, Guid? ContractId);
    public record ActiveBody(bool IsActive);
}
