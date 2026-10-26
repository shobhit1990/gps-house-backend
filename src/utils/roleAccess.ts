// import { Roles } from "../domain/enums/Roles";
// import { AppError } from "./errors";

// const CREATOR_DELETE_BYPASS_ROLE_CODES = new Set<string>([
//   Roles.SUPER_ADMIN,
//   Roles.ADMIN,
// ]);

// /** Role table id 1 (Super Administrator) gets every permission flag. */
// export const FULL_ACCESS_ROLE_ID = 1;

// /** User table id 1 is the seeded Super Administrator account. */
// export const FULL_ACCESS_USER_ID = 1;

// export function isFullAccessRole(roleId?: number | null): boolean {
//   return roleId === FULL_ACCESS_ROLE_ID;
// }

// export function isProtectedUser(userId?: number | null): boolean {
//   return userId === FULL_ACCESS_USER_ID;
// }

// /** Super Administrator user (id 1) cannot be updated or deleted. */
// export function assertUserCanBeMutated(userId?: number | null): void {
//   if (isProtectedUser(userId)) {
//     throw new AppError("Super Administrator user cannot be updated or deleted", 403);
//   }
// }

// /** Super Administrator role (id 1) cannot be updated or deleted. */
// export function assertRoleCanBeMutated(roleId?: number | null): void {
//   if (isFullAccessRole(roleId)) {
//     throw new AppError("Super Administrator role cannot be updated or deleted", 403);
//   }
// }

// export function isAdminOrSuperAdminRole(roleCode?: string | null): boolean {
//   return !!roleCode && CREATOR_DELETE_BYPASS_ROLE_CODES.has(roleCode);
// }

// export function canBypassCreatorDelete(roleCode?: string | null): boolean {
//   return isAdminOrSuperAdminRole(roleCode);
// }

// /** Super Admin/Admin-created records are public; others are visible only to the creator. */
// export function canViewAdminPublicOrOwnRecord(
//   createdByUserId: number | undefined | null,
//   createdByRoleCode: string | undefined | null,
//   actorUserId: number,
// ): boolean {
//   if (createdByUserId === actorUserId) {
//     return true;
//   }
//   return isAdminOrSuperAdminRole(createdByRoleCode);
// }

// /** Non-admin users can delete only records they created. */
// export function assertActorCanDeleteCreatedRecord(
//   createdByUserId: number | undefined | null,
//   actorUserId: number,
//   roleCode?: string | null,
// ): void {
//   if (canBypassCreatorDelete(roleCode)) {
//     return;
//   }
//   if (!createdByUserId || createdByUserId !== actorUserId) {
//     throw new AppError("You can only delete records created by you", 403);
//   }
// }

// /** Apply full-access or all-false defaults to a permission-like flags object. */
// export function applyRolePermissionDefaults(
//   roleId: number | undefined | null,
//   target: {
//     view: boolean;
//     add: boolean;
//     edit: boolean;
//     delete: boolean;
//     filter: boolean;
//     print: boolean;
//     excel: boolean;
//   },
// ): void {
//   if (isFullAccessRole(roleId)) {
//     target.view = true;
//     target.add = true;
//     target.edit = true;
//     target.delete = true;
//     target.filter = true;
//     target.print = true;
//     target.excel = true;
//     return;
//   }

//   target.view = false;
//   target.add = false;
//   target.edit = false;
//   target.delete = false;
//   target.filter = false;
//   target.print = false;
//   target.excel = false;
// }
