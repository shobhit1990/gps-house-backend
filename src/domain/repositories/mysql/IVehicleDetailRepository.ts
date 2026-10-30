import { VehicleDetail } from "../../entities/mysql/VehicleDetail";
import { Client } from "../../entities/mysql/Client";

export interface IVehicleDetailRepository {
  getVehicleDetails(): Promise<VehicleDetail[]>;

  getVehicleDetailById(externalId: string): Promise<VehicleDetail | null>;

  createVehicleDetail(vehicleDetail: VehicleDetail): Promise<VehicleDetail>;

  updateVehicleDetail(vehicleDetail: VehicleDetail): Promise<VehicleDetail>;

  deleteVehicleDetail(externalId: string, deletedBy?: Client): Promise<void>;
}
