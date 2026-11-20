import {
  CreateAddVehicleDto,
  UpdateAddVehicleDto,
} from "../../domain/dto/AddVehicleDto";
import { AddVehicle } from "../../domain/entities/mysql/AddVehicle";
import { ModifiedType } from "../../domain/enums/ModifiedType";
import {
  StoppageSummaryFilter,
  SubscriptionReportFilter,
} from "../../domain/repositories/mysql/IAddVehicleRepository";

export type AddVehicleResponse = Record<string, unknown>;

export type StoppageSummaryReportItem = {
  vehicle: {
    id: string;
    vehicleNo: string;
    nickname: string | null;
  };
  client: {
    id: string;
    name: string | null;
    companyName: string;
  };
  transporter: {
    id: string;
    name: string | null;
    companyName: string;
  };
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type VehicleLogReportItem = AddVehicleResponse & {
  sn: number;
  modifiedType: ModifiedType | null;
  modifiedDate: Date;
};

export type VehicleLogReportQuery = {
  modifiedType?: string;
  month?: string;
  year?: string;
  search?: string;
};

export interface IAddVehicleService {
  getAddVehicle(
    filter?: SubscriptionReportFilter,
  ): Promise<AddVehicleResponse[]>;

  getAddVehicleById(externalId: string): Promise<AddVehicleResponse>;

  getSubscriptionExpiredReport(
    filter: SubscriptionReportFilter,
  ): Promise<AddVehicleResponse[]>;

  getSubscriptionChangedReport(
    filter: SubscriptionReportFilter,
  ): Promise<AddVehicleResponse[]>;

  getStoppageSummaryReport(
    filter: StoppageSummaryFilter,
  ): Promise<StoppageSummaryReportItem[]>;

  getVehicleLogReport(
    query: VehicleLogReportQuery,
  ): Promise<VehicleLogReportItem[]>;

  mapVehicleDetail(vehicle: AddVehicle): AddVehicleResponse;

  createAddVehicle(payload: CreateAddVehicleDto): Promise<AddVehicleResponse>;

  updateAddVehicle(
    externalId: string,
    payload: UpdateAddVehicleDto,
  ): Promise<AddVehicleResponse>;

  deleteAddVehicle(externalId: string): Promise<void>;
}
