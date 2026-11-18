import { AddVehicle } from "../../entities/mysql/AddVehicle";

export interface SubscriptionExpiredFilter {
  clientExternalId?: string;
  transporterExternalId?: string;
}

export interface IAddVehicleRepository {

  getAddVehicle(): Promise<AddVehicle[]>;

  getAddVehicleById(externalId: string): Promise<AddVehicle | null>;

  getSubscriptionExpired(filter: SubscriptionExpiredFilter): Promise<AddVehicle[]>;

  createAddVehicle(vehicle: AddVehicle): Promise<AddVehicle>;

  updateAddVehicle(vehicle: AddVehicle): Promise<AddVehicle>;

  deleteAddVehicle(externalId: string): Promise<void>;
}
