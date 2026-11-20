import { EntityManager } from "@mikro-orm/mysql";
import { MenuItem } from "../domain/entities/mysql/MenuItem";
import { Role } from "../domain/entities/mysql/Role";
import { RoleMenuPermission } from "../domain/entities/mysql/RoleMenuPermission";
import { User } from "../domain/entities/mysql/User";
import { UserMenuPermission } from "../domain/entities/mysql/UserMenuPermission";
import { Status } from "../domain/enums/status";

type PermissionFlags = Pick<
  RoleMenuPermission,
  "view" | "add" | "edit" | "delete" | "filter" | "print" | "excel"
>;

const NO_ACCESS: PermissionFlags = {
  view: false,
  add: false,
  edit: false,
  delete: false,
  filter: false,
  print: false,
  excel: false,
};

function applyFlags(
  target: UserMenuPermission | RoleMenuPermission,
  flags: PermissionFlags,
): void {
  target.view = flags.view;
  target.add = flags.add;
  target.edit = flags.edit;
  target.delete = flags.delete;
  target.filter = flags.filter;
  target.print = flags.print;
  target.excel = flags.excel;
}

/**
 * For a newly created role: one RoleMenuPermission per active menu, all flags false.
 * Skips menus that already have a row for this role.
 */
export async function ensureEmptyRoleMenuPermissions(
  em: EntityManager,
  role: Role,
): Promise<void> {
  if (!Number.isSafeInteger(role.id) || role.id < 1) {
    return;
  }

  const menus = await em.find(MenuItem, {
    isDeleted: false,
    status: Status.ACTIVE,
  });
  if (menus.length === 0) {
    return;
  }

  const existing = await em.find(RoleMenuPermission, { role: role.id });
  const existingMenuIds = new Set(existing.map((row) => row.menuItem.id));

  for (const menu of menus) {
    if (existingMenuIds.has(menu.id)) {
      continue;
    }

    const permission = new RoleMenuPermission();
    permission.role = role;
    permission.menuItem = menu;
    applyFlags(permission, NO_ACCESS);
    permission.status = Status.ACTIVE;
    em.persist(permission);
  }

  await em.flush();
}

/**
 * For a newly created user: copy UserMenuPermission from the user's role
 * RoleMenuPermission rows (same menus + same flags).
 * If the user has no role / role has no rows, map every active menu with all flags false.
 */
export async function ensureUserMenuPermissionsFromRole(
  em: EntityManager,
  user: User,
): Promise<void> {
  if (!Number.isSafeInteger(user.id) || user.id < 1) {
    return;
  }

  const roleId = user.userType?.id;
  const existing = await em.find(UserMenuPermission, { user: user.id });
  const existingMenuIds = new Set(existing.map((row) => row.menuItem.id));

  if (roleId) {
    const rolePermissions = await em.find(
      RoleMenuPermission,
      {
        role: roleId,
        isDeleted: false,
        status: Status.ACTIVE,
      },
      { populate: ["menuItem"] },
    );

    if (rolePermissions.length > 0) {
      for (const rolePermission of rolePermissions) {
        const menuId = rolePermission.menuItem.id;
        if (existingMenuIds.has(menuId)) {
          continue;
        }

        const permission = new UserMenuPermission();
        permission.user = user;
        permission.menuItem = rolePermission.menuItem;
        applyFlags(permission, rolePermission);
        permission.status = Status.ACTIVE;
        em.persist(permission);
      }

      await em.flush();
      return;
    }
  }

  const menus = await em.find(MenuItem, {
    isDeleted: false,
    status: Status.ACTIVE,
  });

  for (const menu of menus) {
    if (existingMenuIds.has(menu.id)) {
      continue;
    }

    const permission = new UserMenuPermission();
    permission.user = user;
    permission.menuItem = menu;
    applyFlags(permission, NO_ACCESS);
    permission.status = Status.ACTIVE;
    em.persist(permission);
  }

  await em.flush();
}

/** @deprecated Use ensureUserMenuPermissionsFromRole */
export async function ensureEmptyUserMenuPermissions(
  em: EntityManager,
  user: User,
): Promise<void> {
  await ensureUserMenuPermissionsFromRole(em, user);
}

/**
 * When a role-menu permission changes, push the same flags/status onto every
 * user who has that role (user.userType). Creates missing user rows; soft-deletes
 * matching user rows when the role permission is soft-deleted.
 */
export async function syncUserMenuPermissionsFromRolePermission(
  em: EntityManager,
  rolePermission: RoleMenuPermission,
): Promise<void> {
  const roleId = rolePermission.role?.id;
  const menuItemId = rolePermission.menuItem?.id;
  if (
    !Number.isSafeInteger(roleId) ||
    roleId! < 1 ||
    !Number.isSafeInteger(menuItemId) ||
    menuItemId! < 1
  ) {
    return;
  }

  const users = await em.find(User, {
    userType: roleId,
    isDeleted: false,
  });
  if (users.length === 0) {
    return;
  }

  for (const user of users) {
    let userPermission = await em.findOne(UserMenuPermission, {
      user: user.id,
      menuItem: menuItemId,
    });

    if (rolePermission.isDeleted) {
      if (userPermission && !userPermission.isDeleted) {
        userPermission.isDeleted = true;
        userPermission.deletedAt = new Date();
        userPermission.updatedAt = new Date();
        em.persist(userPermission);
      }
      continue;
    }

    if (!userPermission) {
      userPermission = new UserMenuPermission();
      userPermission.user = user;
      userPermission.menuItem = rolePermission.menuItem;
    }

    applyFlags(userPermission, rolePermission);
    userPermission.status = rolePermission.status;
    userPermission.isDeleted = false;
    userPermission.deletedAt = null as unknown as undefined;
    userPermission.deletedBy = undefined;
    userPermission.updatedAt = new Date();
    em.persist(userPermission);
  }

  await em.flush();
}
