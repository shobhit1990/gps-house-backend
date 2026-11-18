import {
  CreateAddVehicleDto,
  UpdateAddVehicleDto,
} from "../../domain/dto/AddVehicleDto";
import { SubscriptionReportFilter } from "../../domain/repositories/mysql/IAddVehicleRepository";

export type AddVehicleResponse = Record<string, unknown>;

export interface IAddVehicleService {
  getAddVehicle(): Promise<AddVehicleResponse[]>;

  getAddVehicleById(externalId: string): Promise<AddVehicleResponse>;

  getSubscriptionExpiredReport(
    filter: SubscriptionReportFilter,
  ): Promise<AddVehicleResponse[]>;

  getSubscriptionChangedReport(
    filter: SubscriptionReportFilter,
  ): Promise<AddVehicleResponse[]>;

  createAddVehicle(payload: CreateAddVehicleDto): Promise<AddVehicleResponse>;

  updateAddVehicle(
    externalId: string,
    payload: UpdateAddVehicleDto,
  ): Promise<AddVehicleResponse>;

  deleteAddVehicle(externalId: string): Promise<void>;
}
