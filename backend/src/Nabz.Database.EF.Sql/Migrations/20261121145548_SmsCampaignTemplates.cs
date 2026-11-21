using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nabz.Database.EF.Sql.Migrations
{
    /// <inheritdoc />
    public partial class SmsCampaignTemplates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SmsCampaignTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    BodyPreview = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProviderTemplateName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    TokenKeysJson = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    RequiresEmrUrl = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SmsCampaignTemplates", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SmsCampaignTemplates_Code",
                table: "SmsCampaignTemplates",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SmsCampaignTemplates_SortOrder",
                table: "SmsCampaignTemplates",
                column: "SortOrder");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SmsCampaignTemplates");
        }
    }
}
