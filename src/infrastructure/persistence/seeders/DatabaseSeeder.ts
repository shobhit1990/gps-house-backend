import { EntityManager } from "@mikro-orm/mysql";
import { Seeder } from "@mikro-orm/seeder";
import UserSeeder from "./UserSeeder";
import { MenuItemSeeder } from "./MenuItemSeeder";
import LanguageSeeder from "./LanguageSeeder";
import TimeZoneSeeder from "./TimeZoneSeeder";
import UserRoleSeeder from "./UserRoleSeeder";
import RoleMenuPermissionSeeder from "./RoleMenuPermissionSeeder";
import UserMenuPermissionSeeder from "./UserMenuPermissionSeeder";
import { logger } from "../../../configs/logger";

export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    try {
      await new LanguageSeeder().run(em);
      await new TimeZoneSeeder().run(em);
      await new UserRoleSeeder().run(em);
      await new UserSeeder().run(em);
      await new MenuItemSeeder().run(em);
      await new RoleMenuPermissionSeeder().run(em);
      await new UserMenuPermissionSeeder().run(em);

      logger.info("All Seeded data finished.");
    } catch (error) {
      logger.error("Error during seeding:", error);
      throw error;
    }
  }
}