/*
 File: backend/src/Nabz.Database.EF.Sql/Migrations/20261122103000_AddBrandLogoStorageKeys.cs
 Description: کلید لوگوی کلینیک و لوگوی شریک قرارداد برای PDF
 Parent Dependencies: NabzDbContext
 */

using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Nabz.Database.EF.Sql;

#nullable disable

namespace Nabz.Database.EF.Sql.Migrations;

[DbContext(typeof(NabzDbContext))]
[Migration("20261122103000_AddBrandLogoStorageKeys")]
public partial class AddBrandLogoStorageKeys : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "LogoStorageKey",
            table: "Clinics",
            type: "nvarchar(500)",
            maxLength: 500,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "PartnerLogoStorageKey",
            table: "CorporateContracts",
            type: "nvarchar(500)",
            maxLength: 500,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "LogoStorageKey",
            table: "Clinics");

        migrationBuilder.DropColumn(
            name: "PartnerLogoStorageKey",
            table: "CorporateContracts");
    }
}
