import { Seeder } from "@mikro-orm/seeder";
import { EntityManager } from "@mikro-orm/mysql";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../../configs/logger";
import { Role } from "../../../domain/entities/mysql/Role";
import { Roles, RoleNameMap } from "../../../domain/enums/Roles";
import { Status } from "../../../domain/enums/status";

const SEED_ROLES: Roles[] = [
  Roles.SUPER_ADMIN,
  Roles.ADMIN,
  Roles.CLIENT,
  Roles.TECHNICIAN,
  Roles.TRANSPORTER,
  Roles.USER,
];

export class UserRoleSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    if (!em) {
      throw new Error("Entity manager is required");
    }

    try {
      for (const roleCode of SEED_ROLES) {
        const name = RoleNameMap[roleCode];
        const existing = await em.findOne(Role, {
          $or: [{ roleCode }, { name }],
        });

        if (existing) {
          if (existing.isDeleted) {
            logger.info(
              `Role "${roleCode}" exists but is soft-deleted. Skipping recreate.`,
            );
            continue;
          }

          if (!existing.roleCode) {
            existing.roleCode = roleCode;
            existing.updatedAt = new Date();
            em.persist(existing);
            logger.info(
              `Role "${name}" found without roleCode. Backfilled to "${roleCode}".`,
            );
            continue;
          }

          logger.info(`Role "${roleCode}" already exists. Skipping.`);
          continue;
        }

        const role = new Role();
        role.externalId = uuidv4();
        role.roleCode = roleCode;
        role.name = name;
        role.status = Status.ACTIVE;
        role.isDeleted = false;
        role.createdAt = new Date();
        role.updatedAt = new Date();

        em.persist(role);
        logger.info(`Role "${roleCode}" (${name}) created successfully.`);
      }

      await em.flush();
      logger.info("UserRoleSeeder finished.");
    } catch (error) {
      logger.error("UserRoleSeeder error:", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
}

export default UserRoleSeeder;
