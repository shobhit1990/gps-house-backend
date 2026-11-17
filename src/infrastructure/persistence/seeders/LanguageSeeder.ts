import { Seeder } from "@mikro-orm/seeder";
import { EntityManager } from "@mikro-orm/mysql";
import { logger } from "../../../configs/logger";
import { Language } from "../../../domain/entities/mysql/Language";
import { Status } from "../../../domain/enums/status";

const LANGUAGES = [
  { languageName: "English", reason: "English language" },
  { languageName: "Hindi", reason: "Hindi language" },
  { languageName: "Spanish", reason: "Spanish language" },
  { languageName: "French", reason: "French language" },
] as const;

export class LanguageSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    if (!em) {
      throw new Error("Entity manager is required");
    }

    try {
      for (const item of LANGUAGES) {
        const existing = await em.findOne(Language, {
          languageName: item.languageName,
          isDeleted: false,
        });

        if (existing) {
          logger.info(
            `Language "${item.languageName}" already exists. Skipping.`,
          );
          continue;
        }

        const language = new Language();
        language.languageName = item.languageName;
        language.reason = item.reason;
        language.status = Status.ACTIVE;
        language.isDeleted = false;
        language.createdAt = new Date();
        language.updatedAt = new Date();

        em.persist(language);
        logger.info(`Language "${item.languageName}" created successfully.`);
      }

      await em.flush();
    } catch (error) {
      logger.error("LanguageSeeder error:", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
}

export default LanguageSeeder;
