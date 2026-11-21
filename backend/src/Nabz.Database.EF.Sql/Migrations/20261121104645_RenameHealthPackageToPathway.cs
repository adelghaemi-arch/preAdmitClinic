/*
 File: backend/src/Nabz.Database.EF.Sql/Migrations/20261121104645_RenameHealthPackageToPathway.cs
 Description: rename دامنه بسته سلامت → مسیر سلامتی بدون از دست رفتن داده
 Parent Dependencies: NabzDbContext
 */

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nabz.Database.EF.Sql.Migrations;

/// <inheritdoc />
public partial class RenameHealthPackageToPathway : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.RenameColumn(
            name: "AssignedPackageTitle",
            table: "Patients",
            newName: "AssignedPathwayTitle");

        migrationBuilder.RenameColumn(
            name: "AssignedPackageCode",
            table: "Patients",
            newName: "AssignedPathwayCode");

        migrationBuilder.RenameColumn(
            name: "DefaultPackageCode",
            table: "CorporateContracts",
            newName: "DefaultPathwayCode");

        migrationBuilder.RenameColumn(
            name: "MatchedRuleTitle",
            table: "ContractMembers",
            newName: "MatchedPathwayTitle");

        migrationBuilder.RenameColumn(
            name: "ManualPackageOverride",
            table: "ContractMembers",
            newName: "ManualPathwayOverride");

        migrationBuilder.RenameColumn(
            name: "AssignedPackageTitle",
            table: "ContractMembers",
            newName: "AssignedPathwayTitle");

        migrationBuilder.RenameColumn(
            name: "AssignedPackageCode",
            table: "ContractMembers",
            newName: "AssignedPathwayCode");

        // rename جدول‌ها و ستون کد قالب ایستگاهی — داده seed/قرارداد حفظ می‌شود
        migrationBuilder.RenameTable(
            name: "PackageLibraryRules",
            newName: "PathwayLibraryRules");

        migrationBuilder.RenameColumn(
            name: "PackageCode",
            table: "PathwayLibraryRules",
            newName: "PathwayCode");

        migrationBuilder.RenameTable(
            name: "ContractPackageRules",
            newName: "ContractPathwayRules");

        migrationBuilder.RenameColumn(
            name: "PackageCode",
            table: "ContractPathwayRules",
            newName: "PathwayCode");

        migrationBuilder.RenameIndex(
            name: "IX_ContractPackageRules_ContractId",
            table: "ContractPathwayRules",
            newName: "IX_ContractPathwayRules_ContractId");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.RenameIndex(
            name: "IX_ContractPathwayRules_ContractId",
            table: "ContractPathwayRules",
            newName: "IX_ContractPackageRules_ContractId");

        migrationBuilder.RenameColumn(
            name: "PathwayCode",
            table: "ContractPathwayRules",
            newName: "PackageCode");

        migrationBuilder.RenameTable(
            name: "ContractPathwayRules",
            newName: "ContractPackageRules");

        migrationBuilder.RenameColumn(
            name: "PathwayCode",
            table: "PathwayLibraryRules",
            newName: "PackageCode");

        migrationBuilder.RenameTable(
            name: "PathwayLibraryRules",
            newName: "PackageLibraryRules");

        migrationBuilder.RenameColumn(
            name: "AssignedPathwayTitle",
            table: "Patients",
            newName: "AssignedPackageTitle");

        migrationBuilder.RenameColumn(
            name: "AssignedPathwayCode",
            table: "Patients",
            newName: "AssignedPackageCode");

        migrationBuilder.RenameColumn(
            name: "DefaultPathwayCode",
            table: "CorporateContracts",
            newName: "DefaultPackageCode");

        migrationBuilder.RenameColumn(
            name: "MatchedPathwayTitle",
            table: "ContractMembers",
            newName: "MatchedRuleTitle");

        migrationBuilder.RenameColumn(
            name: "ManualPathwayOverride",
            table: "ContractMembers",
            newName: "ManualPackageOverride");

        migrationBuilder.RenameColumn(
            name: "AssignedPathwayTitle",
            table: "ContractMembers",
            newName: "AssignedPackageTitle");

        migrationBuilder.RenameColumn(
            name: "AssignedPathwayCode",
            table: "ContractMembers",
            newName: "AssignedPackageCode");
    }
}
