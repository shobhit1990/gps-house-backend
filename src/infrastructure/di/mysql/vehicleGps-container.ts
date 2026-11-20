import { container } from "tsyringe";
import { IVehicleGpsDeviceRepository } from "../../../domain/repositories/mysql/IVehicleGpsDeviceRepository";
import { VehicleGpsDeviceRepository } from "../../persistence/repositories/mysql/VehicleGpsDeviceRepository";
import { IRedisService } from "../../../services/interfaces/IRedisService";
import { RedisService } from "../../../services/RedisService";
import { IVehicleGpsDeviceResolver } from "../../../services/interfaces/IVehicleGpsDeviceResolver";
import { VehicleGpsDeviceResolver } from "../../../services/VehicleGpsDeviceResolver";
import { IVehicleGpsDeviceService } from "../../../services/interfaces/IVehicleGpsDeviceService";
import { VehicleGpsDeviceService } from "../../../services/VehicleGpsDeviceService";
import { IVehicleLiveTrackingService } from "../../../services/interfaces/IVehicleLiveTrackingService";
import { VehicleLiveTrackingService } from "../../../services/VehicleLiveTrackingService";

/** MySQL/Redis side of vehicle GPS tracking (Mongo side lives in di/mongo/container.ts). */
export function registerVehicleGpsDependencies() {
  container.registerSingleton<IRedisService>("IRedisService", RedisService);
  container.register<IVehicleGpsDeviceRepository>("IVehicleGpsDeviceRepository", VehicleGpsDeviceRepository);
  // Singletons: the resolver owns a refresh timer and the device service a socket-throttle map.
  container.registerSingleton<IVehicleGpsDeviceResolver>("IVehicleGpsDeviceResolver", VehicleGpsDeviceResolver);
  container.registerSingleton<IVehicleGpsDeviceService>("IVehicleGpsDeviceService", VehicleGpsDeviceService);
  container.register<IVehicleLiveTrackingService>("IVehicleLiveTrackingService", VehicleLiveTrackingService);
}
