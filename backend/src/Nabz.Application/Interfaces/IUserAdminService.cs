/*
 File: backend/src/Nabz.Application/Interfaces/IUserAdminService.cs
 Description: مدیریت رجیستری کاربران برای ادمین کل و ادمین کلینیک با فیلتر نقش Platform
 Parent Dependencies: AppRole, PlatformUserDto
 */

using Nabz.Application.Common;
using Nabz.Domain.Enums;

namespace Nabz.Application.Interfaces;

public interface IUserAdminService
{
    IReadOnlyList<AppRole> ListAssignableRoles(bool actorIsPlatformAdmin);
    Task<IReadOnlyList<PlatformUserDto>> ListUsersAsync(
        bool actorIsPlatformAdmin,
        bool includeInactiveContracts = false,
        string? q = null,
        CancellationToken ct = default);
    Task<PagedResultDto<PlatformUserDto>> ListUsersPagedAsync(
        bool actorIsPlatformAdmin,
        int page,
        int pageSize,
        string? q = null,
        bool includeInactiveContracts = false,
        CancellationToken ct = default);
    Task<PlatformUserDto> UpsertUserAsync(
        bool actorIsPlatformAdmin,
        Guid? userId,
        string firstName,
        string lastName,
        string mobile,
        string? nationalId,
        AppRole primaryRole,
        Guid? clinicId,
        Guid? contractId,
        string actor,
        CancellationToken ct = default);
    Task SetUserActiveAsync(bool actorIsPlatformAdmin, Guid userId, bool isActive, string actor, CancellationToken ct = default);
}
