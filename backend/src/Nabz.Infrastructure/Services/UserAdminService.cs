/*
 File: backend/src/Nabz.Infrastructure/Services/UserAdminService.cs
 Description: upsert/فعال‌سازی کاربران با گارد مخفی‌بودن نقش Platform از ادمین کلینیک
 Parent Dependencies: IUserRepository, IPlatformRepository, IUnitOfWork
 */

using Nabz.Application.Abstractions;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Domain.Entities;
using Nabz.Domain.Enums;

namespace Nabz.Infrastructure.Services;

public sealed class UserAdminService(
    IUserRepository users,
    IPlatformRepository platform,
    IUnitOfWork uow) : IUserAdminService
{
    private static readonly AppRole[] AllRoles = Enum.GetValues<AppRole>();
    private static readonly AppRole[] ClinicAssignableRoles =
        AllRoles.Where(r => r != AppRole.Platform).ToArray();

    public IReadOnlyList<AppRole> ListAssignableRoles(bool actorIsPlatformAdmin)
        => actorIsPlatformAdmin ? AllRoles : ClinicAssignableRoles;

    public async Task<IReadOnlyList<PlatformUserDto>> ListUsersAsync(bool actorIsPlatformAdmin, CancellationToken ct = default)
    {
        // ادمین کلینیک اصلاً نباید از وجود ادمین‌های کل مطلع شود
        var exclude = actorIsPlatformAdmin ? (AppRole?)null : AppRole.Platform;
        var list = await users.ListUsersAsync(exclude, 500, ct);
        return list.Select(Map).ToList();
    }

    public async Task<PlatformUserDto> UpsertUserAsync(
        bool actorIsPlatformAdmin,
        Guid? userId,
        string fullName,
        string mobile,
        string? nationalId,
        AppRole primaryRole,
        Guid? clinicId,
        Guid? contractId,
        string actor,
        CancellationToken ct = default)
    {
        EnsureAssignable(actorIsPlatformAdmin, primaryRole);

        User user;
        if (userId is Guid id)
        {
            user = await users.GetByIdAsync(id, ct)
                ?? throw new InvalidOperationException("کاربر یافت نشد.");
            EnsureTargetVisible(actorIsPlatformAdmin, user);
            user.FullName = fullName;
            user.NationalId = nationalId;
            user.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            var existing = await users.GetByMobileAsync(mobile, ct);
            if (existing is not null)
            {
                // موبایل متعلق به ادمین کل برای ادمین کلینیک «یافت نشد» می‌ماند
                EnsureTargetVisible(actorIsPlatformAdmin, existing);
                user = existing;
                user.FullName = fullName;
                user.NationalId = nationalId;
                user.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                user = new User
                {
                    FullName = fullName,
                    Mobile = mobile.Trim(),
                    NationalId = nationalId,
                    IsActive = true
                };
                await users.AddAsync(user, ct);
            }
        }

        if (!user.Roles.Any(r => r.Role == primaryRole && r.ContractId == contractId))
        {
            users.AddRole(new UserRoleAssignment
            {
                UserId = user.Id,
                Role = primaryRole,
                ClinicId = clinicId,
                ContractId = contractId
            });
        }

        await platform.AddAuditAsync(new PlatformAuditEntry
        {
            Actor = actor,
            Action = actorIsPlatformAdmin ? "PLATFORM_UPSERT_USER" : "ADMIN_UPSERT_USER",
            Target = user.Id.ToString(),
            Detail = primaryRole.ToString()
        }, ct);
        await uow.SaveChangesAsync(ct);

        var roles = (await users.ListRolesAsync(user.Id, ct)).Select(r => r.Role.ToString()).ToList();
        return new PlatformUserDto(user.Id, user.FullName, user.Mobile, user.NationalId, user.IsActive, roles);
    }

    public async Task SetUserActiveAsync(bool actorIsPlatformAdmin, Guid userId, bool isActive, string actor, CancellationToken ct = default)
    {
        var user = await users.GetByIdAsync(userId, ct)
            ?? throw new InvalidOperationException("کاربر یافت نشد.");
        EnsureTargetVisible(actorIsPlatformAdmin, user);

        user.IsActive = isActive;
        user.UpdatedAt = DateTime.UtcNow;
        await platform.AddAuditAsync(new PlatformAuditEntry
        {
            Actor = actor,
            Action = actorIsPlatformAdmin ? "PLATFORM_SET_USER_ACTIVE" : "ADMIN_SET_USER_ACTIVE",
            Target = userId.ToString(),
            Detail = isActive.ToString()
        }, ct);
        await uow.SaveChangesAsync(ct);
    }

    private static void EnsureAssignable(bool actorIsPlatformAdmin, AppRole role)
    {
        // ادمین کلینیک هرگز نباید نقش Platform را حتی با درخواست جعلی کلاینت منصوب کند
        if (!actorIsPlatformAdmin && role == AppRole.Platform)
            throw new UnauthorizedAccessException("انتصاب این نقش مجاز نیست.");
    }

    private static void EnsureTargetVisible(bool actorIsPlatformAdmin, User user)
    {
        if (actorIsPlatformAdmin) return;
        if (user.Roles.Any(r => r.Role == AppRole.Platform))
            throw new InvalidOperationException("کاربر یافت نشد.");
    }

    private static PlatformUserDto Map(User user)
        => new(
            user.Id,
            user.FullName,
            user.Mobile,
            user.NationalId,
            user.IsActive,
            user.Roles.Select(r => r.Role.ToString()).Distinct().ToList());
}
