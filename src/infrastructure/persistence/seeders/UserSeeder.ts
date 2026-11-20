import { Seeder } from "@mikro-orm/seeder";
import { EntityManager } from "@mikro-orm/mysql";
import { logger } from "../../../configs/logger";
import { User } from "../../../domain/entities/mysql/User";
import { Roles } from "../../../domain/enums/Roles";
import { Status } from "../../../domain/enums/status";
import {
  hashPassword,
  isBcryptPasswordHash,
} from "../../../utils/passwordHash";
import { assignUserRole } from "../../../utils/userRoleAssignment";

const DEFAULT_ADMIN_PASSWORD = "Admin@123456";

export class UserSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    if (!em) {
      throw new Error("Entity manager is required");
    }

    try {
      const existingUser = await em.findOne(
        User,
        { userName: "admin" },
        { populate: ["userType"] },
      );

      if (existingUser) {
        let changed = false;

        if (!isBcryptPasswordHash(existingUser.password)) {
          existingUser.password = await hashPassword(DEFAULT_ADMIN_PASSWORD);
          changed = true;
          logger.info("Default admin user password hashed.");
        }

        if (existingUser.userType?.roleCode !== Roles.SUPER_ADMIN) {
          await assignUserRole(em, existingUser, Roles.SUPER_ADMIN);
          changed = true;
          logger.info(
            "Default admin userType linked to SUPER_ADMIN role.",
          );
        }

        if (changed) {
          await em.flush();
        } else {
          logger.info("Default admin user already exists. Skipping.");
        }
        return;
      }

      const defaultUser = new User();

      defaultUser.companyName = "ASG Innovation";
      defaultUser.userName = "admin";
      defaultUser.password = await hashPassword(DEFAULT_ADMIN_PASSWORD);
      defaultUser.companyAddress = "Lucknow, Uttar Pradesh, India";
      defaultUser.dataRestriction = "60";
      defaultUser.status = Status.ACTIVE;
      defaultUser.createdAt = new Date();
      defaultUser.updatedAt = new Date();

      await assignUserRole(em, defaultUser, Roles.SUPER_ADMIN);

      em.persist(defaultUser);
      await em.flush();

      logger.info("Default admin user created successfully.");
    } catch (error) {
      logger.error("UserSeeder error:", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
}

export default UserSeeder;
