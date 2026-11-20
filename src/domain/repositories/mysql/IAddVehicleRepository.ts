import { Minutes } from "../../enums/Minutes";
import { ModifiedType } from "../../enums/ModifiedType";
import { AddVehicle } from "../../entities/mysql/AddVehicle";

export interface SubscriptionReportFilter {
  clientExternalId?: string;
  transporterExternalId?: string;
  vehicleExternalId?: string;
}

export type SubscriptionExpiredFilter = SubscriptionReportFilter;

export interface StoppageSummaryFilter extends SubscriptionReportFilter {
  duration: Minutes;
  startDate: Date;
  endDate: Date;
}

export interface VehicleLogReportFilter {
  modifiedType?: ModifiedType;
  search?: string;
  /** Inclusive start of the selected month, applied to last updated date. */
  updatedFrom?: Date;
  /** Exclusive end of the selected month, applied to last updated date. */
  updatedTo?: Date;
}

export interface IAddVehicleRepository {

  getAddVehicle(filter?: SubscriptionReportFilter): Promise<AddVehicle[]>;

  getAddVehicleById(externalId: string): Promise<AddVehicle | null>;

  getSubscriptionExpired(filter: SubscriptionReportFilter): Promise<AddVehicle[]>;

  getSubscriptionChanged(filter: SubscriptionReportFilter): Promise<AddVehicle[]>;

  getVehicleLogReport(filter: VehicleLogReportFilter): Promise<AddVehicle[]>;

  createAddVehicle(vehicle: AddVehicle): Promise<AddVehicle>;

  updateAddVehicle(vehicle: AddVehicle): Promise<AddVehicle>;

  deleteAddVehicle(externalId: string): Promise<void>;
}
