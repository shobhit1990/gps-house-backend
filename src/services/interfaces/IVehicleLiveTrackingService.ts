import { VehicleLiveTrackingItem } from "../../domain/models/VehicleLiveTrackingModels";
import { LiveTrackingVehicleFilter } from "../../domain/repositories/mysql/IVehicleGpsDeviceRepository";

export interface IVehicleLiveTrackingService {
  getVehicleLiveTracking(filter?: LiveTrackingVehicleFilter): Promise<VehicleLiveTrackingItem[]>;
}
