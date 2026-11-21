using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nabz.Database.EF.Sql.Migrations
{
    /// <inheritdoc />
    public partial class FraudWireKeyAndPhotoMimeType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MimeType",
                table: "PatientPhotos",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "image/jpeg");

            migrationBuilder.AddColumn<string>(
                name: "WireWrapKey",
                table: "FraudCaptureSessions",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MimeType",
                table: "PatientPhotos");

            migrationBuilder.DropColumn(
                name: "WireWrapKey",
                table: "FraudCaptureSessions");
        }
    }
}
