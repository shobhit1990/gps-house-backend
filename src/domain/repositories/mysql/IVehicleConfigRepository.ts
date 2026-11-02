import { Client } from "../../entities/mysql/Client";
import { VehicleConfig } from "../../entities/mysql/VehicleConfig";

export interface IVehicleConfigRepository {
  getVehicleConfigs(): Promise<VehicleConfig[]>;

  getVehicleConfigById(externalId: string): Promise<VehicleConfig | null>;

  createVehicleConfig(vehicleConfig: VehicleConfig): Promise<VehicleConfig>;

  updateVehicleConfig(vehicleConfig: VehicleConfig): Promise<VehicleConfig>;

  deleteVehicleConfig(externalId: string, deletedBy?: Client): Promise<void>;
}
