import { AddVehicle } from "../../entities/mysql/AddVehicle";

export interface SubscriptionReportFilter {
  clientExternalId?: string;
  transporterExternalId?: string;
}

export type SubscriptionExpiredFilter = SubscriptionReportFilter;

export interface IAddVehicleRepository {

  getAddVehicle(): Promise<AddVehicle[]>;

  getAddVehicleById(externalId: string): Promise<AddVehicle | null>;

  getSubscriptionExpired(filter: SubscriptionReportFilter): Promise<AddVehicle[]>;

  getSubscriptionChanged(filter: SubscriptionReportFilter): Promise<AddVehicle[]>;

  createAddVehicle(vehicle: AddVehicle): Promise<AddVehicle>;

  updateAddVehicle(vehicle: AddVehicle): Promise<AddVehicle>;

  deleteAddVehicle(externalId: string): Promise<void>;
}
