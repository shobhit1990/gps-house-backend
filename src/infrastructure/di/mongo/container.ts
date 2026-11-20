import { container } from "tsyringe";
import { EntityManager, MikroORM } from "@mikro-orm/mongodb";
import { logger } from "../../../configs/logger";
import { IVehicleGpsQueueRepository } from "../../../domain/repositories/mongo/IVehicleGpsQueueRepository";
import { VehicleGpsQueueRepository } from "../../persistence/repositories/mongo/VehicleGpsQueueRepository";
import { IVehicleGpsTrackingRepository } from "../../../domain/repositories/mongo/IVehicleGpsTrackingRepository";
import { VehicleGpsTrackingRepository } from "../../persistence/repositories/mongo/VehicleGpsTrackingRepository";
import { IVehicleGpsStatusRepository } from "../../../domain/repositories/mongo/IVehicleGpsStatusRepository";
import { VehicleGpsStatusRepository } from "../../persistence/repositories/mongo/VehicleGpsStatusRepository";
import { IVehicleGpsTrackingService } from "../../../services/interfaces/IVehicleGpsTrackingService";
import { VehicleGpsTrackingService } from "../../../services/VehicleGpsTrackingService";
import { IVehicleGpsQueue } from "../../../services/interfaces/IVehicleGpsQueue";
import { VehicleGpsQueue } from "../../../services/VehicleGpsQueue";
import { IVehicleGpsListenerManager } from "../../../services/interfaces/IVehicleGpsListenerManager";
import { VehicleGpsListenerManager } from "../../../services/VehicleGpsListenerManager";

/**
 * Register Mongo-backed feature dependencies here as modules are added.
 */
export function registerMongoDependencies(orm: MikroORM) {
  container.register("MongoEntityManager", { useValue: orm.em });
  // Class token used by the Mongo repositories (distinct from the MySQL EntityManager class).
  container.register<EntityManager>(EntityManager, { useValue: orm.em });

  // Vehicle GPS tracking (queue, history, listener)
  container.registerSingleton<IVehicleGpsQueueRepository>("IVehicleGpsQueueRepository", VehicleGpsQueueRepository);
  container.registerSingleton<IVehicleGpsTrackingRepository>(
    "IVehicleGpsTrackingRepository",
    VehicleGpsTrackingRepository,
  );
  container.registerSingleton<IVehicleGpsStatusRepository>("IVehicleGpsStatusRepository", VehicleGpsStatusRepository);
  container.registerSingleton<IVehicleGpsTrackingService>("IVehicleGpsTrackingService", VehicleGpsTrackingService);
  container.registerSingleton<IVehicleGpsQueue>("IVehicleGpsQueue", VehicleGpsQueue);
  container.registerSingleton<IVehicleGpsListenerManager>("IVehicleGpsListenerManager", VehicleGpsListenerManager);

  logger.info("Mongo dependencies registered");
}
