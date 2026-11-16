import { Seeder } from "@mikro-orm/seeder";
import { EntityManager } from "@mikro-orm/mysql";
import { logger } from "../../../configs/logger";
import { User } from "../../../domain/entities/mysql/User";
import { Status } from "../../../domain/enums/status";
import { UserType } from "../../../domain/enums/UserType";

export class UserSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        if (!em) {
            throw new Error("Entity manager is required");
        }

        try {
            const existingUser = await em.findOne(User, {
                userName: "admin",
            });

            if (existingUser) {
                logger.info("Default admin user already exists. Skipping.");
                return;
            }

            const defaultUser = new User();

            defaultUser.companyName = "ASG Innovation";
            defaultUser.userName = "admin";
            defaultUser.password = "Admin@123456";
            defaultUser.email = "admin@gmail.com";
            defaultUser.phone = "9876500001";
            defaultUser.companyAddress = "Lucknow, Uttar Pradesh, India";
            defaultUser.dataRestriction = "60";
            defaultUser.userType = UserType.USER;
            defaultUser.status = Status.ACTIVE;
            defaultUser.createdAt = new Date();
            defaultUser.updatedAt = new Date();

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