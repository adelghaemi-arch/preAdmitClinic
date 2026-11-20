using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nabz.Database.EF.Sql.Migrations
{
    /// <inheritdoc />
    public partial class EvidenceFileDeletedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "PatientPhotos",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "IntakeDocumentFiles",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "PatientPhotos");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "IntakeDocumentFiles");
        }
    }
}
