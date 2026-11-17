import { EntityManager } from "@mikro-orm/mysql";
import { Seeder } from "@mikro-orm/seeder";
import UserSeeder from "./UserSeeder";
import { MenuItemSeeder } from "./MenuItemSeeder";
import LanguageSeeder from "./LanguageSeeder";
import TimeZoneSeeder from "./TimeZoneSeeder";
import { logger } from "../../../configs/logger";

export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    try {
      await new LanguageSeeder().run(em);
      await new TimeZoneSeeder().run(em);
      await new UserSeeder().run(em);
      await new MenuItemSeeder().run(em);

      logger.info("All Seeded data finished.");
    } catch (error) {
      logger.error("Error during seeding:", error);
      throw error;
    }
  }
}