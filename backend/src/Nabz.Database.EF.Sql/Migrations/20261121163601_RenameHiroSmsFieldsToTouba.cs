using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nabz.Database.EF.Sql.Migrations
{
    /// <inheritdoc />
    public partial class RenameHiroSmsFieldsToTouba : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "HiroUsername",
                table: "Clinics",
                newName: "ToubaUsername");

            migrationBuilder.RenameColumn(
                name: "HiroPassword",
                table: "Clinics",
                newName: "ToubaPassword");

            migrationBuilder.RenameColumn(
                name: "HiroWsdlUrl",
                table: "Clinics",
                newName: "ToubaSendUrl");

            migrationBuilder.RenameColumn(
                name: "HiroOtpMessageTemplate",
                table: "Clinics",
                newName: "ToubaOtpMessageTemplate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ToubaUsername",
                table: "Clinics",
                newName: "HiroUsername");

            migrationBuilder.RenameColumn(
                name: "ToubaPassword",
                table: "Clinics",
                newName: "HiroPassword");

            migrationBuilder.RenameColumn(
                name: "ToubaSendUrl",
                table: "Clinics",
                newName: "HiroWsdlUrl");

            migrationBuilder.RenameColumn(
                name: "ToubaOtpMessageTemplate",
                table: "Clinics",
                newName: "HiroOtpMessageTemplate");
        }
    }
}
