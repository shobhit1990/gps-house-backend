import { Seeder } from "@mikro-orm/seeder";
import { EntityManager } from "@mikro-orm/mysql";
import { logger } from "../../../configs/logger";
import { TimeZone } from "../../../domain/entities/mysql/TimeZone";
import { Status } from "../../../domain/enums/status";

const TIME_ZONES = [
  {
    timeZone: "(GMT+5:30) Asia/Calcutta",
    reason: "India Standard Time",
  },
  {
    timeZone: "(GMT0:00) UTC",
    reason: "Coordinated Universal Time",
  },
  {
    timeZone: "(GMT-8:00) America/Los_Angeles",
    reason: "Pacific Time",
  },
  {
    timeZone: "(GMT+11:00) Australia/Sydney",
    reason: "Australian Eastern Time",
  },
] as const;

export class TimeZoneSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    if (!em) {
      throw new Error("Entity manager is required");
    }

    try {
      for (const item of TIME_ZONES) {
        const existing = await em.findOne(TimeZone, {
          timeZone: item.timeZone,
          isDeleted: false,
        });

        if (existing) {
          logger.info(`Timezone "${item.timeZone}" already exists. Skipping.`);
          continue;
        }

        const timezone = new TimeZone();
        timezone.timeZone = item.timeZone;
        timezone.reason = item.reason;
        timezone.status = Status.ACTIVE;
        timezone.isDeleted = false;
        timezone.createdAt = new Date();
        timezone.updatedAt = new Date();

        em.persist(timezone);
        logger.info(`Timezone "${item.timeZone}" created successfully.`);
      }

      await em.flush();
    } catch (error) {
      logger.error("TimeZoneSeeder error:", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
}

export default TimeZoneSeeder;
