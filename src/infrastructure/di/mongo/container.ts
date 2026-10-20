import { container } from "tsyringe";
import { EntityManager, MikroORM } from "@mikro-orm/mongodb";
import { logger } from "../../../configs/logger";

/**
 * Register Mongo-backed feature dependencies here as modules are added.
 */
export function registerMongoDependencies(orm: MikroORM) {
  container.register("MongoEntityManager", { useValue: orm.em });
  logger.info("Mongo dependencies registered");
}
