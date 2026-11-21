/*
 File: backend/src/Nabz.Database.EF.Sql/Migrations/20261120194648_FormAnswerUpsertIdsAndUniqueItemCode.cs
 Description: ValueGeneratedNever ضمنی + ItemCode(128) و ایندکس یکتا ResponseId+ItemCode برای upsert
 Parent Dependencies: NabzDbContext FormAnswer/FormResponse
 */

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nabz.Database.EF.Sql.Migrations
{
    /// <inheritdoc />
    public partial class FormAnswerUpsertIdsAndUniqueItemCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_FormAnswers_ResponseId",
                table: "FormAnswers");

            // قبل از ایندکس یکتا: تکراری‌های احتمالی (ResponseId, ItemCode) را نگه داشتن تازه‌ترین
            migrationBuilder.Sql("""
                ;WITH d AS (
                  SELECT Id,
                    ROW_NUMBER() OVER (
                      PARTITION BY ResponseId, ItemCode
                      ORDER BY UpdatedAt DESC, CreatedAt DESC, Id DESC) AS rn
                  FROM FormAnswers
                )
                DELETE FROM FormAnswers WHERE Id IN (SELECT Id FROM d WHERE rn > 1);
                """);

            migrationBuilder.AlterColumn<string>(
                name: "ItemCode",
                table: "FormAnswers",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_FormAnswers_ResponseId_ItemCode",
                table: "FormAnswers",
                columns: new[] { "ResponseId", "ItemCode" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_FormAnswers_ResponseId_ItemCode",
                table: "FormAnswers");

            migrationBuilder.AlterColumn<string>(
                name: "ItemCode",
                table: "FormAnswers",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(128)",
                oldMaxLength: 128);

            migrationBuilder.CreateIndex(
                name: "IX_FormAnswers_ResponseId",
                table: "FormAnswers",
                column: "ResponseId");
        }
    }
}
