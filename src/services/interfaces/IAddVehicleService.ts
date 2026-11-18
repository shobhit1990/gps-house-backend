import {
  CreateAddVehicleDto,
  UpdateAddVehicleDto,
} from "../../domain/dto/AddVehicleDto";
import { AddVehicle } from "../../domain/entities/mysql/AddVehicle";
import { SubscriptionExpiredFilter } from "../../domain/repositories/mysql/IAddVehicleRepository";

export type AddVehicleResponse = Record<string, unknown>;

export type SubscriptionExpiredReportItem = {
  id: string;
  vehicleNo: string;
  active: boolean;
  transporter: {
    id: string;
    name: string | null;
    companyName: string;
  };
  subscriptionStartDate: Date;
  subscriptionDueDate: Date;
};

export interface IAddVehicleService {
  getAddVehicle(): Promise<AddVehicleResponse[]>;

  getAddVehicleById(externalId: string): Promise<AddVehicleResponse>;

  getSubscriptionExpiredReport(
    filter: SubscriptionExpiredFilter,
  ): Promise<SubscriptionExpiredReportItem[]>;

  createAddVehicle(payload: CreateAddVehicleDto): Promise<AddVehicleResponse>;

  updateAddVehicle(
    externalId: string,
    payload: UpdateAddVehicleDto,
  ): Promise<AddVehicleResponse>;

  deleteAddVehicle(externalId: string): Promise<void>;
}
