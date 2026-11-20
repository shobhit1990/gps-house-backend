import { EntityManager } from "@mikro-orm/mysql";
import { Seeder } from "@mikro-orm/seeder";
import { logger } from "../../../configs/logger";
import { MenuItem } from "../../../domain/entities/mysql/MenuItem";
import { User } from "../../../domain/entities/mysql/User";
import { UserMenuPermission } from "../../../domain/entities/mysql/UserMenuPermission";
import { Status } from "../../../domain/enums/status";

const DEFAULT_ADMIN_USERNAME = "admin";

function applyFullAccessFlags(permission: UserMenuPermission): void {
  permission.view = true;
  permission.add = true;
  permission.edit = true;
  permission.delete = true;
  permission.filter = true;
  permission.print = true;
  permission.excel = true;
}

function clearSoftDelete(permission: UserMenuPermission): void {
  permission.isDeleted = false;
  permission.deletedAt = null as unknown as undefined;
  permission.deletedBy = undefined;
}

/**
 * Seeds full menu permissions for the default admin user from UserSeeder.
 */
export class UserMenuPermissionSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    if (!em) {
      throw new Error("Entity manager is required");
    }

    try {
      const admin = await em.findOne(User, {
        userName: DEFAULT_ADMIN_USERNAME,
        isDeleted: false,
        status: Status.ACTIVE,
      });
      if (!admin) {
        logger.warn(
          `UserMenuPermissionSeeder: active user "${DEFAULT_ADMIN_USERNAME}" not found. Run UserSeeder first.`,
        );
        return;
      }

      const menus = await em.find(MenuItem, {
        isDeleted: false,
        status: Status.ACTIVE,
      });
      if (menus.length === 0) {
        logger.warn(
          "UserMenuPermissionSeeder: no active menu items found. Run MenuItemSeeder first.",
        );
        return;
      }

      let created = 0;
      let updated = 0;

      for (const menu of menus) {
        if (!Number.isSafeInteger(menu.id) || menu.id < 1) {
          throw new Error(
            `UserMenuPermissionSeeder: menu "${menu.key}" has no persisted id`,
          );
        }

        let permission = await em.findOne(UserMenuPermission, {
          user: admin.id,
          menuItem: menu.id,
        });
        const isNew = !permission;
        if (!permission) {
          permission = new UserMenuPermission();
          permission.user = admin;
          permission.menuItem = menu;
        }

        applyFullAccessFlags(permission);
        permission.status = Status.ACTIVE;
        clearSoftDelete(permission);
        em.persist(permission);

        if (isNew) {
          created += 1;
        } else {
          updated += 1;
        }
      }

      await em.flush();
      logger.info(
        `UserMenuPermissionSeeder finished for "${DEFAULT_ADMIN_USERNAME}". created=${created}, updated=${updated}.`,
      );
    } catch (error) {
      logger.error("UserMenuPermissionSeeder error:", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
}

export default UserMenuPermissionSeeder;
