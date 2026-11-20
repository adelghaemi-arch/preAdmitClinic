using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nabz.Database.EF.Sql.Migrations
{
    /// <inheritdoc />
    public partial class ContractMemberIntroducedMobileAndAuthLoginMobile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IntroducedMobile",
                table: "ContractMembers",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LoginMobile",
                table: "AuthSessions",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            // دادهٔ قدیمی: شماره معرفی = موبایل Person همان عضو
            migrationBuilder.Sql("""
                UPDATE m
                SET m.IntroducedMobile = p.Mobile
                FROM ContractMembers m
                INNER JOIN Persons p ON p.Id = m.PersonId
                WHERE m.IntroducedMobile IS NULL AND p.Mobile IS NOT NULL AND p.Mobile <> ''
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IntroducedMobile",
                table: "ContractMembers");

            migrationBuilder.DropColumn(
                name: "LoginMobile",
                table: "AuthSessions");
        }
    }
}
