/*
 File: backend/tests/Nabz.Infrastructure.Tests/UseCases/Admin/UcAdm05b_CorporatePathwayStationCatalogTests.cs
 Description: UC-ADM-05b — ترتیب ایستگاه‌های seed سازمانی مطابق پروتکل کلینیک
 Parent Dependencies: CorporatePathwayStationCatalog, HealthPathwayTitles
 */

using Nabz.Application.Identity;

namespace Nabz.Infrastructure.Tests.UseCases.Admin;

public sealed class UcAdm05b_CorporatePathwayStationCatalogTests
{
    [Fact]
    public void UcAdm05b_CorporateCatalog_HasFourGenderAgePathways()
    {
        Assert.Equal(4, CorporatePathwayStationCatalog.Entries.Count);
        Assert.Equal(
            [
                HealthPathwayTitles.CorpMenLt40,
                HealthPathwayTitles.CorpMenGe40,
                HealthPathwayTitles.CorpWomenLt40,
                HealthPathwayTitles.CorpWomenGe40,
            ],
            CorporatePathwayStationCatalog.Entries.Select(e => e.Code).ToArray());
    }

    [Theory]
    [InlineData(HealthPathwayTitles.CorpMenLt40, "LAB,US_ABD,HOSP_MEAL,ECG,REMOTE_REVIEW")]
    [InlineData(HealthPathwayTitles.CorpMenGe40, "LAB,US_ABD,HOSP_MEAL,ECG,CARDIO,STRESS,REMOTE_REVIEW")]
    [InlineData(HealthPathwayTitles.CorpWomenLt40, "LAB,US_ABD,US_BREAST,HOSP_MEAL,ECG,GYN,PAP,REMOTE_REVIEW")]
    [InlineData(HealthPathwayTitles.CorpWomenGe40, "LAB,US_ABD,US_BREAST,HOSP_MEAL,ECG,CARDIO,STRESS,GYN,PAP,REMOTE_REVIEW")]
    public void UcAdm05b_CorporateCatalog_StationOrder_MatchesProtocol(string code, string expectedCsv)
    {
        var actual = string.Join(",", CorporatePathwayStationCatalog.RoomCodes(code));
        Assert.Equal(expectedCsv, actual);
    }

    [Fact]
    public void UcAdm05b_MenUnder40_HasNoCardioOrStress()
    {
        var codes = CorporatePathwayStationCatalog.RoomCodes(HealthPathwayTitles.CorpMenLt40);
        Assert.DoesNotContain("CARDIO", codes);
        Assert.DoesNotContain("STRESS", codes);
        Assert.Contains("ECG", codes);
        Assert.Contains(CorporatePathwayStationCatalog.HospMeal, codes);
    }

    [Fact]
    public void UcAdm05b_WomenUnder40_KeepsBreastUltrasound()
    {
        var codes = CorporatePathwayStationCatalog.RoomCodes(HealthPathwayTitles.CorpWomenLt40);
        Assert.Contains("US_BREAST", codes);
        Assert.DoesNotContain("CARDIO", codes);
        Assert.DoesNotContain("STRESS", codes);
    }

    [Fact]
    public void UcAdm05b_OptionalFlags_MatchProtocol()
    {
        static HashSet<string> OptionalOf(string code) =>
            CorporatePathwayStationCatalog.Find(code)!.Stations
                .Where(s => s.IsOptional)
                .Select(s => s.RoomCode)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

        Assert.Equal(
            new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "HOSP_MEAL" },
            OptionalOf(HealthPathwayTitles.CorpMenLt40));
        Assert.Equal(
            new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "HOSP_MEAL", "STRESS" },
            OptionalOf(HealthPathwayTitles.CorpMenGe40));
        Assert.Equal(
            new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "HOSP_MEAL", "PAP" },
            OptionalOf(HealthPathwayTitles.CorpWomenLt40));
        Assert.Equal(
            new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "HOSP_MEAL", "STRESS", "PAP" },
            OptionalOf(HealthPathwayTitles.CorpWomenGe40));
    }
}
