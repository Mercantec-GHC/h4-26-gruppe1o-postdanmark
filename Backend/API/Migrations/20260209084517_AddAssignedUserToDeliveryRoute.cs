using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class AddAssignedUserToDeliveryRoute : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DeliveryRoutes_RouteStatuses_RouteStatusId",
                table: "DeliveryRoutes");

            migrationBuilder.DropForeignKey(
                name: "FK_DeliveryRoutes_Users_UserId",
                table: "DeliveryRoutes");

            migrationBuilder.DropForeignKey(
                name: "FK_Stops_StopStatuses_StopStatusId",
                table: "Stops");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Roles_RoleId",
                table: "Users");

            migrationBuilder.AddColumn<int>(
                name: "AssignedUserId",
                table: "DeliveryRoutes",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryRoutes_AssignedUserId",
                table: "DeliveryRoutes",
                column: "AssignedUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_DeliveryRoutes_RouteStatuses_RouteStatusId",
                table: "DeliveryRoutes",
                column: "RouteStatusId",
                principalTable: "RouteStatuses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DeliveryRoutes_Users_AssignedUserId",
                table: "DeliveryRoutes",
                column: "AssignedUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DeliveryRoutes_Users_UserId",
                table: "DeliveryRoutes",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Stops_StopStatuses_StopStatusId",
                table: "Stops",
                column: "StopStatusId",
                principalTable: "StopStatuses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Roles_RoleId",
                table: "Users",
                column: "RoleId",
                principalTable: "Roles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DeliveryRoutes_RouteStatuses_RouteStatusId",
                table: "DeliveryRoutes");

            migrationBuilder.DropForeignKey(
                name: "FK_DeliveryRoutes_Users_AssignedUserId",
                table: "DeliveryRoutes");

            migrationBuilder.DropForeignKey(
                name: "FK_DeliveryRoutes_Users_UserId",
                table: "DeliveryRoutes");

            migrationBuilder.DropForeignKey(
                name: "FK_Stops_StopStatuses_StopStatusId",
                table: "Stops");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Roles_RoleId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_DeliveryRoutes_AssignedUserId",
                table: "DeliveryRoutes");

            migrationBuilder.DropColumn(
                name: "AssignedUserId",
                table: "DeliveryRoutes");

            migrationBuilder.AddForeignKey(
                name: "FK_DeliveryRoutes_RouteStatuses_RouteStatusId",
                table: "DeliveryRoutes",
                column: "RouteStatusId",
                principalTable: "RouteStatuses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_DeliveryRoutes_Users_UserId",
                table: "DeliveryRoutes",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Stops_StopStatuses_StopStatusId",
                table: "Stops",
                column: "StopStatusId",
                principalTable: "StopStatuses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Roles_RoleId",
                table: "Users",
                column: "RoleId",
                principalTable: "Roles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
