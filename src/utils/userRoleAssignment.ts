import { EntityManager } from "@mikro-orm/mysql";
import { Role } from "../domain/entities/mysql/Role";
import { User } from "../domain/entities/mysql/User";
import { Roles } from "../domain/enums/Roles";
import { Status } from "../domain/enums/status";
import { UserType } from "../domain/enums/UserType";
import { AppError } from "./errors";

const USER_TYPE_VALUES = new Set<string>(Object.values(UserType));

/** Map UserType / roleCode onto Roles. */
export function toRoleCode(roleOrUserType: Roles | UserType | string): string {
  return String(roleOrUserType);
}

/** roleCode values that also appear in the UserType enum. */
export function userTypeFromRoleCode(roleCode: string): UserType | undefined {
  if (USER_TYPE_VALUES.has(roleCode)) {
    return roleCode as UserType;
  }
  return undefined;
}

/** Attach Role to User via the `user_type` FK. */
export async function assignUserRole(
  em: EntityManager,
  user: User,
  roleOrUserType: Roles | UserType | string,
): Promise<Role> {
  const roleCode = toRoleCode(roleOrUserType);
  const role = await em.findOne(Role, {
    roleCode,
    isDeleted: false,
    status: Status.ACTIVE,
  });

  if (!role) {
    throw new AppError(
      `Role "${roleCode}" not found. Ensure UserRoleSeeder has run.`,
      500,
    );
  }

  user.userType = role;
  return role;
}
