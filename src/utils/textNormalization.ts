import { Transform } from "class-transformer";
import { Role } from "../domain/entities/mysql/Role";
import { AppError } from "./errors";

// const CREATOR_DELETE_BYPASS_ROLE_CODES = new Set<string>([
//   Role.SUPER_ADMIN,
//   Role.ADMIN,
// ]);


function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function toProperCase(value: string): string {
  const normalized = normalizeWhitespace(value).toLowerCase();
  return normalized.replace(/(^|[\s'-])([a-z])/g, (_m, separator: string, char: string) => {
    return `${separator}${char.toUpperCase()}`;
  });
}

export const ToProperCase = () =>
  Transform(({ value }) => {
    if (typeof value !== "string") return value;
    const normalized = normalizeWhitespace(value);
    return normalized === "" ? normalized : toProperCase(normalized);
  });

export const ToLowerCase = () =>
  Transform(({ value }) => (typeof value === "string" ? normalizeWhitespace(value).toLowerCase() : value));

/** Role table id 1 (Super Administrator) gets every permission flag. */
export const FULL_ACCESS_ROLE_ID = 1;

/** User table id 1 is the seeded Super Administrator account. */
export const FULL_ACCESS_USER_ID = 1;

export function isFullAccessRole(roleId?: number | null): boolean {
  return roleId === FULL_ACCESS_ROLE_ID;
}

export function isProtectedUser(userId?: number | null): boolean {
  return userId === FULL_ACCESS_USER_ID;
}

/** Super Administrator user (id 1) cannot be updated or deleted. */
export function assertUserCanBeMutated(userId?: number | null): void {
  if (isProtectedUser(userId)) {
    throw new AppError("Super Administrator user cannot be updated or deleted", 403);
  }
}

/** Super Administrator role (id 1) cannot be updated or deleted. */
export function assertRoleCanBeMutated(roleId?: number | null): void {
  if (isFullAccessRole(roleId)) {
    throw new AppError("Super Administrator role cannot be updated or deleted", 403);
  }
}
