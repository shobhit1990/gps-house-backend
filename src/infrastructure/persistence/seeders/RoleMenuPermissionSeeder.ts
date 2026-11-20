import { EntityManager } from "@mikro-orm/mysql";
import { Seeder } from "@mikro-orm/seeder";
import { logger } from "../../../configs/logger";
import { MenuItem } from "../../../domain/entities/mysql/MenuItem";
import { Role } from "../../../domain/entities/mysql/Role";
import { RoleMenuPermission } from "../../../domain/entities/mysql/RoleMenuPermission";
import { Roles } from "../../../domain/enums/Roles";
import { Status } from "../../../domain/enums/status";

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
  target: RoleMenuPermission,
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

function clearSoftDelete(entity: RoleMenuPermission): void {
  entity.isDeleted = false;
  entity.deletedAt = null as unknown as undefined;
  entity.deletedBy = undefined;
}

/**
 * Every active role gets every active menu mapped.
 * SUPER_ADMIN / ADMIN → all permission flags true.
 * All other roles → all permission flags false.
 */
export class RoleMenuPermissionSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    if (!em) {
      throw new Error("Entity manager is required");
    }

    try {
      const roles = await em.find(Role, {
        isDeleted: false,
        status: Status.ACTIVE,
      });
      if (roles.length === 0) {
        logger.warn(
          "RoleMenuPermissionSeeder: no active roles found. Run UserRoleSeeder first.",
        );
        return;
      }

      const menus = await em.find(MenuItem, {
        isDeleted: false,
        status: Status.ACTIVE,
      });
      if (menus.length === 0) {
        logger.warn(
          "RoleMenuPermissionSeeder: no active menu items found. Run MenuItemSeeder first.",
        );
        return;
      }

      let created = 0;
      let updated = 0;

      for (const role of roles) {
        const flags = FULL_ACCESS_ROLES.has(role.roleCode)
          ? FULL_ACCESS
          : NO_ACCESS;

        for (const menu of menus) {
          let permission = await em.findOne(RoleMenuPermission, {
            role: role.id,
            menuItem: menu.id,
          });
          const isNew = !permission;
          if (!permission) {
            permission = new RoleMenuPermission();
            permission.role = role;
            permission.menuItem = menu;
          }

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

        logger.info(
          `RoleMenuPermissionSeeder: role "${role.roleCode}" → ${menus.length} menu(s), fullAccess=${FULL_ACCESS_ROLES.has(role.roleCode)}.`,
        );
      }

      await em.flush();
      logger.info(
        `RoleMenuPermissionSeeder finished. created=${created}, updated=${updated}.`,
      );
    } catch (error) {
      logger.error("RoleMenuPermissionSeeder error:", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
}

export default RoleMenuPermissionSeeder;
