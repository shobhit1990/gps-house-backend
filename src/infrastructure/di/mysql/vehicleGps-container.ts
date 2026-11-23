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
import { ITravelSummaryService } from "../../../services/interfaces/ITravelSummaryService";
import { TravelSummaryService } from "../../../services/TravelSummaryService";
import { IIdleSummaryService } from "../../../services/interfaces/IIdleSummaryService";
import { IdleSummaryService } from "../../../services/IdleSummaryService";
import { ISpeedDistanceService } from "../../../services/interfaces/ISpeedDistanceService";
import { SpeedDistanceService } from "../../../services/SpeedDistanceService";
import { IStatusReportService } from "../../../services/interfaces/IStatusReportService";
import { StatusReportService } from "../../../services/StatusReportService";
import { ISensorReportService } from "../../../services/interfaces/ISensorReportService";
import { SensorReportService } from "../../../services/SensorReportService";
import { IRideReportService } from "../../../services/interfaces/IRideReportService";
import { RideReportService } from "../../../services/RideReportService";
import { IGeofenceReportService } from "../../../services/interfaces/IGeofenceReportService";
import { GeofenceReportService } from "../../../services/GeofenceReportService";
import { IReverseGeocodeService } from "../../../services/interfaces/IReverseGeocodeService";
import { ReverseGeocodeService } from "../../../services/ReverseGeocodeService";

/** MySQL/Redis side of vehicle GPS tracking (Mongo side lives in di/mongo/container.ts). */
export function registerVehicleGpsDependencies() {
  container.registerSingleton<IRedisService>("IRedisService", RedisService);
  container.registerSingleton<IReverseGeocodeService>("IReverseGeocodeService", ReverseGeocodeService);
  container.register<IVehicleGpsDeviceRepository>("IVehicleGpsDeviceRepository", VehicleGpsDeviceRepository);
  // Singletons: the resolver owns a refresh timer and the device service a socket-throttle map.
  container.registerSingleton<IVehicleGpsDeviceResolver>("IVehicleGpsDeviceResolver", VehicleGpsDeviceResolver);
  container.registerSingleton<IVehicleGpsDeviceService>("IVehicleGpsDeviceService", VehicleGpsDeviceService);
  container.register<IVehicleLiveTrackingService>("IVehicleLiveTrackingService", VehicleLiveTrackingService);
  container.register<ITravelSummaryService>("ITravelSummaryService", TravelSummaryService);
  container.register<IIdleSummaryService>("IIdleSummaryService", IdleSummaryService);
  container.register<ISpeedDistanceService>("ISpeedDistanceService", SpeedDistanceService);
  container.register<IStatusReportService>("IStatusReportService", StatusReportService);
  container.register<ISensorReportService>("ISensorReportService", SensorReportService);
  container.register<IRideReportService>("IRideReportService", RideReportService);
  container.register<IGeofenceReportService>(
    "IGeofenceReportService",
    GeofenceReportService,
  );
}
