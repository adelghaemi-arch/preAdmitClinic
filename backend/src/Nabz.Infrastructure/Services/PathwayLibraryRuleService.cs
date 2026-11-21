/*
 File: backend/src/Nabz.Infrastructure/Services/PathwayLibraryRuleService.cs
 Description: CRUD کتابخانه قوانین؛ همگام‌سازی قوانین قرارداد متصل و آمار استفاده
 Parent Dependencies: IPathwayLibraryRuleRepository, IContractRepository, IUnitOfWork
 */

using Nabz.Application.Abstractions;
using Nabz.Application.Identity;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Domain.Entities;

namespace Nabz.Infrastructure.Services;

public sealed class PathwayLibraryRuleService(
    IPathwayLibraryRuleRepository library,
    IContractRepository contracts,
    IUnitOfWork uow) : IPathwayLibraryRuleService
{
    public async Task<IReadOnlyList<PathwayLibraryRuleDto>> ListAsync(string? query, int take = 200, CancellationToken ct = default)
    {
        var list = await library.ListAsync(query, take, ct);
        var result = new List<PathwayLibraryRuleDto>(list.Count);
        foreach (var rule in list)
            result.Add(await MapWithStatsAsync(rule, ct));
        return result;
    }

    public async Task<PathwayLibraryRuleDto?> GetAsync(Guid id, CancellationToken ct = default)
    {
        var rule = await library.GetByIdAsync(id, ct);
        return rule is null ? null : await MapWithStatsAsync(rule, ct);
    }

    public async Task<PathwayLibraryRuleDto> CreateAsync(UpsertPathwayLibraryRuleRequest request, CancellationToken ct = default)
    {
        Validate(request);
        var count = await library.CountAsync(ct);
        var entity = new PathwayLibraryRule
        {
            Code = $"LR-{(count + 1).ToString().PadLeft(3, '0')}",
            Title = request.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            Gender = NormalizeGender(request.Gender),
            MinAge = request.MinAge,
            MaxAge = request.MaxAge,
            JobCategory = string.IsNullOrWhiteSpace(request.JobCategory) ? "همه" : request.JobCategory.Trim(),
            PathwayCode = request.PathwayCode.Trim()
        };
        await library.AddAsync(entity, ct);
        await uow.SaveChangesAsync(ct);
        return await MapWithStatsAsync(entity, ct);
    }

    public async Task<PathwayLibraryRuleDto> UpdateAsync(Guid id, UpsertPathwayLibraryRuleRequest request, CancellationToken ct = default)
    {
        Validate(request);
        var entity = await library.GetByIdAsync(id, ct)
            ?? throw new InvalidOperationException("قانون کتابخانه یافت نشد.");

        entity.Title = request.Title.Trim();
        entity.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        entity.Gender = NormalizeGender(request.Gender);
        entity.MinAge = request.MinAge;
        entity.MaxAge = request.MaxAge;
        entity.JobCategory = string.IsNullOrWhiteSpace(request.JobCategory) ? "همه" : request.JobCategory.Trim();
        entity.PathwayCode = request.PathwayCode.Trim();
        entity.UpdatedAt = DateTime.UtcNow;

        // ویرایش کتابخانه باید snapshot قوانین قرارداد متصل را همگام کند
        var linked = await contracts.ListPathwayRulesByLibraryRuleIdAsync(id, ct);
        var contractIds = linked.Select(r => r.ContractId).Distinct().ToList();
        foreach (var link in linked)
        {
            link.Title = entity.Title;
            link.Gender = entity.Gender;
            link.MinAge = entity.MinAge;
            link.MaxAge = entity.MaxAge;
            link.JobCategory = entity.JobCategory;
            link.PathwayCode = entity.PathwayCode;
            link.UpdatedAt = DateTime.UtcNow;
        }

        await uow.SaveChangesAsync(ct);

        foreach (var contractId in contractIds)
        {
            var contract = await contracts.GetByIdAsync(contractId, includeMembers: true, ct);
            if (contract is null) continue;
            foreach (var m in contract.Members.Where(x => !x.ManualPathwayOverride))
                ReApplyPathwayRules(contract, m);
            contract.UpdatedAt = DateTime.UtcNow;
        }

        if (contractIds.Count > 0)
            await uow.SaveChangesAsync(ct);

        return await MapWithStatsAsync(entity, ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await library.GetByIdAsync(id, ct)
            ?? throw new InvalidOperationException("قانون کتابخانه یافت نشد.");
        var attached = await library.CountAttachedContractsAsync(id, ct);
        // حذف فقط وقتی هیچ قراردادی متصل نیست — وگرنه اول detach لازم است
        if (attached > 0)
            throw new InvalidOperationException("این قانون به قرارداد متصل است؛ ابتدا از قراردادها جدا کنید.");

        library.Remove(entity);
        await uow.SaveChangesAsync(ct);
    }

    private async Task<PathwayLibraryRuleDto> MapWithStatsAsync(PathwayLibraryRule rule, CancellationToken ct)
    {
        var (active, previously) = await library.CountMemberUsageAsync(rule.Id, ct);
        var contractsCount = await library.CountAttachedContractsAsync(rule.Id, ct);
        return new PathwayLibraryRuleDto(
            rule.Id, rule.Code, rule.Title, rule.Description,
            rule.Gender, rule.MinAge, rule.MaxAge, rule.JobCategory, rule.PathwayCode,
            rule.CreatedAt, active, previously, contractsCount);
    }

    private static void Validate(UpsertPathwayLibraryRuleRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.PathwayCode))
            throw new InvalidOperationException("عنوان قانون و بسته سلامت مقصد را کامل وارد کنید.");
        if (request.MinAge is int min && request.MaxAge is int max && min > max)
            throw new InvalidOperationException("حداقل سن نمی‌تواند از حداکثر سن بزرگ‌تر باشد.");
    }

    private static string NormalizeGender(string gender) =>
        gender is "مرد" or "زن" ? gender : "همه";

    /// <summary>همان منطق ContractService.ApplyPathwayRules — تکرار عمدی برای جلوگیری از وابستگی دوطرفه سرویس‌ها.</summary>
    private static void ReApplyPathwayRules(CorporateContract contract, ContractMember member)
    {
        var age = AgeCalculator.FromBirthDate(member.Person.BirthDate) ?? 0;
        var memberGender = member.Person.Gender ?? "";
        var rule = contract.PathwayRules
            .OrderBy(r => r.Priority)
            .FirstOrDefault(r =>
                (r.Gender == "همه" || r.Gender == memberGender) &&
                (r.JobCategory == "همه" || r.JobCategory == member.JobCategory) &&
                (!r.MinAge.HasValue || age >= r.MinAge) &&
                (!r.MaxAge.HasValue || age <= r.MaxAge));
        if (rule is null)
        {
            var code = string.IsNullOrWhiteSpace(contract.DefaultPathwayCode) ? "FULL_CHECKUP" : contract.DefaultPathwayCode;
            member.AssignedPathwayCode = code;
            member.AssignedPathwayTitle = code;
            member.MatchedPathwayTitle = null;
            return;
        }
        member.AssignedPathwayCode = rule.PathwayCode;
        member.AssignedPathwayTitle = rule.Title;
        member.MatchedPathwayTitle = rule.Title;
    }
}
