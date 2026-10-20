import { container } from "tsyringe";
import { EntityManager, MikroORM } from "@mikro-orm/mysql";
import { logger } from "../../../configs/logger";

/**
 * Register MySQL-backed feature dependencies here as modules are added.
 * Pattern per feature:
 *   container.registerSingleton<IXxxRepository>("IXxxRepository", XxxRepository);
 *   container.registerSingleton<IXxxService>("IXxxService", XxxService);
 */
export function registerMySqlDependencies(orm: MikroORM) {
  container.register<EntityManager>(EntityManager, { useValue: orm.em });
  logger.info("MySQL dependencies registered");
}
