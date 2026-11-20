using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nabz.Database.EF.Sql.Migrations
{
    /// <inheritdoc />
    public partial class ClinicGeoAndPackageEndedAtNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "EndedAt",
                table: "EvidencePackages",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "Clinics",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "Clinics",
                type: "float",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Address",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Clinics");

            migrationBuilder.AlterColumn<DateTime>(
                name: "EndedAt",
                table: "EvidencePackages",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);
        }
    }
}
