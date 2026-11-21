import { EntityManager } from "@mikro-orm/mysql";
import { Seeder } from "@mikro-orm/seeder";
import { logger } from "../../../configs/logger";
import { MenuItem } from "../../../domain/entities/mysql/MenuItem";
import { RoleMenuPermission } from "../../../domain/entities/mysql/RoleMenuPermission";
import { User } from "../../../domain/entities/mysql/User";
import { UserMenuPermission } from "../../../domain/entities/mysql/UserMenuPermission";
import { Roles } from "../../../domain/enums/Roles";
import { Status } from "../../../domain/enums/status";
import { MENU_SEEDS } from "./MenuItemSeeder";

type PermissionFlags = {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  filter: boolean;
  print: boolean;
  excel: boolean;
};

const FULL_ACCESS: PermissionFlags = {
  view: true,
  add: true,
  edit: true,
  delete: true,
  filter: true,
  print: true,
  excel: true,
};

const NO_ACCESS: PermissionFlags = {
  view: false,
  add: false,
  edit: false,
  delete: false,
  filter: false,
  print: false,
  excel: false,
};

const FULL_ACCESS_ROLES = new Set<string>([Roles.SUPER_ADMIN, Roles.ADMIN]);

function applyFlags(
  target: UserMenuPermission,
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

function clearSoftDelete(permission: UserMenuPermission): void {
  permission.isDeleted = false;
  permission.deletedAt = null as unknown as undefined;
  permission.deletedBy = undefined;
}

/**
 * Maps every active user to every MENU_SEEDS menu.
 * SUPER_ADMIN / ADMIN → full access.
 * Other roles → copy flags from RoleMenuPermission when present, else no access.
 * Permissions for menus no longer in MENU_SEEDS are soft-deleted.
 */
export class UserMenuPermissionSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    if (!em) {
      throw new Error("Entity manager is required");
    }

    try {
      const users = await em.find(
        User,
        { isDeleted: false, status: Status.ACTIVE },
        { populate: ["userType"] },
      );
      if (users.length === 0) {
        logger.warn(
          "UserMenuPermissionSeeder: no active users found. Run UserSeeder first.",
        );
        return;
      }

      const menus = await this.loadSeedMenus(em);
      if (menus.length === 0) {
        logger.warn(
          "UserMenuPermissionSeeder: no active menu items found. Run MenuItemSeeder first.",
        );
        return;
      }

      const rolePermissionFlags = await this.loadRolePermissionFlags(em);
      const activeMenuIds = new Set(menus.map((menu) => menu.id));

      let created = 0;
      let updated = 0;
      let removed = 0;

      for (const user of users) {
        const roleCode = user.userType?.roleCode;
        const roleId = user.userType?.id;
        const useFullAccess =
          typeof roleCode === "string" && FULL_ACCESS_ROLES.has(roleCode);

        for (const menu of menus) {
          if (!Number.isSafeInteger(menu.id) || menu.id < 1) {
            throw new Error(
              `UserMenuPermissionSeeder: menu "${menu.key}" has no persisted id`,
            );
          }

          let permission = await em.findOne(UserMenuPermission, {
            user: user.id,
            menuItem: menu.id,
          });
          const isNew = !permission;
          if (!permission) {
            permission = new UserMenuPermission();
            permission.user = user;
            permission.menuItem = menu;
          }

          const flags = useFullAccess
            ? FULL_ACCESS
            : roleId
              ? (rolePermissionFlags.get(`${roleId}:${menu.id}`) ?? NO_ACCESS)
              : NO_ACCESS;

          applyFlags(permission, flags);
          permission.status = Status.ACTIVE;
          clearSoftDelete(permission);
          em.persist(permission);

          if (isNew) {
            created += 1;
          } else {
            updated += 1;
          }
        }

        removed += await this.softDeleteObsoleteForUser(
          em,
          user,
          activeMenuIds,
        );

        logger.info(
          `UserMenuPermissionSeeder: user "${user.userName}" → ${menus.length} menu(s), fullAccess=${useFullAccess}.`,
        );
      }

      await em.flush();
      logger.info(
        `UserMenuPermissionSeeder finished. menus=${menus.length}/${MENU_SEEDS.length}, users=${users.length}, created=${created}, updated=${updated}, softDeleted=${removed}.`,
      );
    } catch (error) {
      logger.error("UserMenuPermissionSeeder error:", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  private async loadSeedMenus(em: EntityManager): Promise<MenuItem[]> {
    const seedKeys = MENU_SEEDS.map((seed) => seed.key);
    const menus = await em.find(MenuItem, {
      key: { $in: seedKeys },
      isDeleted: false,
      status: Status.ACTIVE,
    });

    const foundKeys = new Set(menus.map((menu) => menu.key));
    const missing = seedKeys.filter((key) => !foundKeys.has(key));
    if (missing.length > 0) {
      logger.warn(
        `UserMenuPermissionSeeder: missing ${missing.length} menu(s) from MENU_SEEDS: ${missing.join(", ")}. Run MenuItemSeeder first.`,
      );
    }

    return menus;
  }

  private async loadRolePermissionFlags(
    em: EntityManager,
  ): Promise<Map<string, PermissionFlags>> {
    const rows = await em.find(
      RoleMenuPermission,
      { isDeleted: false, status: Status.ACTIVE },
      { populate: ["role", "menuItem"] },
    );

    const flagsByRoleMenu = new Map<string, PermissionFlags>();
    for (const row of rows) {
      const roleId = row.role?.id;
      const menuId = row.menuItem?.id;
      if (
        !Number.isSafeInteger(roleId) ||
        roleId! < 1 ||
        !Number.isSafeInteger(menuId) ||
        menuId! < 1
      ) {
        continue;
      }
      flagsByRoleMenu.set(`${roleId}:${menuId}`, {
        view: row.view,
        add: row.add,
        edit: row.edit,
        delete: row.delete,
        filter: row.filter,
        print: row.print,
        excel: row.excel,
      });
    }
    return flagsByRoleMenu;
  }

  private async softDeleteObsoleteForUser(
    em: EntityManager,
    user: User,
    activeMenuIds: Set<number>,
  ): Promise<number> {
    const existing = await em.find(
      UserMenuPermission,
      { user: user.id, isDeleted: false },
      { populate: ["menuItem"] },
    );

    let removed = 0;
    for (const permission of existing) {
      const menuId = permission.menuItem?.id;
      if (Number.isSafeInteger(menuId) && activeMenuIds.has(menuId!)) {
        continue;
      }
      permission.isDeleted = true;
      permission.deletedAt = new Date();
      permission.status = Status.INACTIVE;
      em.persist(permission);
      removed += 1;
    }
    return removed;
  }
}

export default UserMenuPermissionSeeder;
