using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nabz.Database.EF.Sql.Migrations
{
    /// <inheritdoc />
    public partial class ClinicSmsProviderSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "PreAdmitSupportPhone",
                table: "Clinics",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HiroOtpMessageTemplate",
                table: "Clinics",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HiroPassword",
                table: "Clinics",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HiroUsername",
                table: "Clinics",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HiroWsdlUrl",
                table: "Clinics",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "KavenegarApiKey",
                table: "Clinics",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "KavenegarOtpTemplate",
                table: "Clinics",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SmsProvider",
                table: "Clinics",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SmsSenderNumber",
                table: "Clinics",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HiroOtpMessageTemplate",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "HiroPassword",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "HiroUsername",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "HiroWsdlUrl",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "KavenegarApiKey",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "KavenegarOtpTemplate",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "SmsProvider",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "SmsSenderNumber",
                table: "Clinics");

            migrationBuilder.AlterColumn<string>(
                name: "PreAdmitSupportPhone",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(32)",
                oldMaxLength: 32,
                oldNullable: true);
        }
    }
}
