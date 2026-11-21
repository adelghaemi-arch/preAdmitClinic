/*
 File: backend/src/Nabz.Database.EF.Sql/Migrations/20261121174211_ApiAbuseIncidentsAndTokenHashIndex.cs
 Description: جدول ApiAbuseIncidents + ایندکس TokenHash (UC-PLT-17)
 Parent Dependencies: NabzDbContext
 */

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nabz.Database.EF.Sql.Migrations
{
    /// <inheritdoc />
    public partial class ApiAbuseIncidentsAndTokenHashIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "TokenHash",
                table: "AuthSessions",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateTable(
                name: "ApiAbuseIncidents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ClientIp = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    DominantFingerprint = table.Column<string>(type: "nvarchar(240)", maxLength: 240, nullable: false),
                    SamePathCount = table.Column<int>(type: "int", nullable: false),
                    TotalCount = table.Column<int>(type: "int", nullable: false),
                    Severity = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    SmsNotified = table.Column<bool>(type: "bit", nullable: false),
                    Acknowledged = table.Column<bool>(type: "bit", nullable: false),
                    AcknowledgedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AcknowledgedBy = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    Detail = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApiAbuseIncidents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApiAbuseIncidents_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuthSessions_TokenHash",
                table: "AuthSessions",
                column: "TokenHash");

            migrationBuilder.CreateIndex(
                name: "IX_ApiAbuseIncidents_Acknowledged_CreatedAt",
                table: "ApiAbuseIncidents",
                columns: new[] { "Acknowledged", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ApiAbuseIncidents_CreatedAt",
                table: "ApiAbuseIncidents",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ApiAbuseIncidents_UserId",
                table: "ApiAbuseIncidents",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApiAbuseIncidents");

            migrationBuilder.DropIndex(
                name: "IX_AuthSessions_TokenHash",
                table: "AuthSessions");

            migrationBuilder.AlterColumn<string>(
                name: "TokenHash",
                table: "AuthSessions",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(128)",
                oldMaxLength: 128);
        }
    }
}
