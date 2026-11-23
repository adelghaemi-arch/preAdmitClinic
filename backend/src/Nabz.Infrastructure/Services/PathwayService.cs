/*
 File: backend/src/Nabz.Infrastructure/Services/PathwayService.cs
 Description: CRUD مسیر سلامتی واحد؛ همگام‌سازی قوانین قرارداد متصل و آمار استفاده
 Parent Dependencies: IPathwayCatalogRepository, IContractRepository, IUnitOfWork
 */

using Nabz.Application.Abstractions;
using Nabz.Application.Identity;
using Nabz.Application.Interfaces;
using Nabz.Application.Interfaces.Repositories;
using Nabz.Domain.Entities;

namespace Nabz.Infrastructure.Services;

public sealed class PathwayService(
    IPathwayCatalogRepository catalog,
    IContractRepository contracts,
    IUnitOfWork uow) : IPathwayService
{
    public async Task<IReadOnlyList<PathwayDto>> ListAsync(string? query, bool libraryOnly = false, int take = 200, CancellationToken ct = default)
    {
        var list = await catalog.ListAsync(query, libraryOnly, take, ct);
        var result = new List<PathwayDto>(list.Count);
        foreach (var def in list)
            result.Add(await MapWithStatsAsync(def, ct));
        return result;
    }

    public async Task<PathwayDto?> GetAsync(Guid id, CancellationToken ct = default)
    {
        var def = await catalog.GetByIdAsync(id, includeStations: true, ct);
        return def is null ? null : await MapWithStatsAsync(def, ct);
    }

    public async Task<PathwayDto> CreateAsync(UpsertPathwayRequest request, CancellationToken ct = default)
    {
        Validate(request);
        var count = await catalog.CountAsync(ct);
        var entity = new PathwayDefinition
        {
            Code = $"HP-{(count + 1).ToString().PadLeft(3, '0')}",
            Title = request.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            Gender = NormalizeGender(request.Gender),
            MinAge = request.MinAge,
            MaxAge = request.MaxAge,
            JobCategory = string.IsNullOrWhiteSpace(request.JobCategory) ? "همه" : request.JobCategory.Trim(),
            IsInLibrary = request.IsInLibrary,
            IsActive = true,
            EstimatedTotalMinutes = request.EstimatedTotalMinutes ?? EstimateMinutes(request.Stations.Count),
        };
        ApplyStations(entity, request.Stations);
        await catalog.AddAsync(entity, ct);
        await uow.SaveChangesAsync(ct);
        return await MapWithStatsAsync(entity, ct);
    }

    public async Task<PathwayDto> UpdateAsync(Guid id, UpsertPathwayRequest request, CancellationToken ct = default)
    {
        Validate(request);
        var entity = await catalog.GetByIdAsync(id, includeStations: true, ct)
            ?? throw new InvalidOperationException("مسیر یافت نشد.");

        entity.Title = request.Title.Trim();
        entity.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        entity.Gender = NormalizeGender(request.Gender);
        entity.MinAge = request.MinAge;
        entity.MaxAge = request.MaxAge;
        entity.JobCategory = string.IsNullOrWhiteSpace(request.JobCategory) ? "همه" : request.JobCategory.Trim();
        entity.IsInLibrary = request.IsInLibrary;
        entity.EstimatedTotalMinutes = request.EstimatedTotalMinutes ?? EstimateMinutes(request.Stations.Count);
        entity.UpdatedAt = DateTime.UtcNow;

        // ایستگاه‌های قبلی را عوض کن — Guid پیشرفت بیمار در wipe/seed تازه بی‌اهمیت است؛ در پرود با احتیاط
        if (entity.Stations.Count > 0)
            catalog.RemoveStations(entity.Stations.ToList());
        entity.Stations.Clear();
        ApplyStations(entity, request.Stations);

        // ویرایش مسیر کتابخانه باید snapshot قوانین قرارداد متصل را همگام کند
        var linked = await contracts.ListPathwayRulesByLibraryPathwayIdAsync(id, ct);
        var contractIds = linked.Select(r => r.ContractId).Distinct().ToList();
        foreach (var link in linked)
        {
            link.Title = entity.Title;
            link.Gender = entity.Gender;
            link.MinAge = entity.MinAge;
            link.MaxAge = entity.MaxAge;
            link.JobCategory = entity.JobCategory;
            link.PathwayCode = entity.Code;
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
        var entity = await catalog.GetByIdAsync(id, includeStations: false, ct)
            ?? throw new InvalidOperationException("مسیر یافت نشد.");
        var attached = await catalog.CountAttachedContractsAsync(id, ct);
        // حذف فقط وقتی هیچ قراردادی متصل نیست
        if (attached > 0)
            throw new InvalidOperationException("این مسیر به قرارداد متصل است؛ ابتدا از قراردادها جدا کنید.");

        catalog.Remove(entity);
        await uow.SaveChangesAsync(ct);
    }

    private async Task<PathwayDto> MapWithStatsAsync(PathwayDefinition def, CancellationToken ct)
    {
        var (active, previously) = await catalog.CountMemberUsageAsync(def.Id, ct);
        var contractsCount = await catalog.CountAttachedContractsAsync(def.Id, ct);
        var stations = def.Stations
            .OrderBy(s => s.StepOrder)
            .Select(s => new PathwayStationDto(s.Id, s.RoomCode, s.TitleFa, s.StepOrder, s.IsOptional))
            .ToList();
        return new PathwayDto(
            def.Id, def.Code, def.Title, def.Description,
            def.Gender, def.MinAge, def.MaxAge, def.JobCategory,
            def.EstimatedTotalMinutes, def.IsActive, def.IsInLibrary,
            stations, def.CreatedAt, active, previously, contractsCount);
    }

    private static void ApplyStations(PathwayDefinition entity, IReadOnlyList<PathwayStationInput> stations)
    {
        var order = 1;
        foreach (var s in stations.OrderBy(x => x.StepOrder))
        {
            if (string.IsNullOrWhiteSpace(s.RoomCode)) continue;
            entity.Stations.Add(new PathwayStationDef
            {
                PathwayDefinitionId = entity.Id,
                RoomCode = s.RoomCode.Trim(),
                TitleFa = string.IsNullOrWhiteSpace(s.TitleFa) ? s.RoomCode.Trim() : s.TitleFa.Trim(),
                StepOrder = order++,
                IsOptional = s.IsOptional
            });
        }
    }

    private static void Validate(UpsertPathwayRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new InvalidOperationException("عنوان مسیر را وارد کنید.");
        if (request.Stations is null || request.Stations.Count == 0)
            throw new InvalidOperationException("حداقل یک ایستگاه برای مسیر لازم است.");
        if (request.MinAge is int min && request.MaxAge is int max && min > max)
            throw new InvalidOperationException("حداقل سن نمی‌تواند از حداکثر سن بزرگ‌تر باشد.");
    }

    private static string NormalizeGender(string gender) =>
        gender is "مرد" or "زن" ? gender : "همه";

    private static int EstimateMinutes(int stationCount) => Math.Max(30, stationCount * 20);

    /// <summary>همان منطق ContractService — تکرار عمدی برای جلوگیری از وابستگی دوطرفه سرویس‌ها.</summary>
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
            var code = string.IsNullOrWhiteSpace(contract.DefaultPathwayCode)
                ? HealthPathwayTitles.DefaultCode
                : contract.DefaultPathwayCode;
            member.AssignedPathwayCode = code;
            member.AssignedPathwayTitle = HealthPathwayTitles.Resolve(code);
            member.MatchedPathwayTitle = null;
            return;
        }
        member.AssignedPathwayCode = rule.PathwayCode;
        member.AssignedPathwayTitle = rule.Title;
        member.MatchedPathwayTitle = rule.Title;
    }
}
