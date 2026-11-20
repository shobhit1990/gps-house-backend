import {
  CreateAddVehicleDto,
  UpdateAddVehicleDto,
} from "../../domain/dto/AddVehicleDto";
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

  createAddVehicle(payload: CreateAddVehicleDto): Promise<AddVehicleResponse>;

  updateAddVehicle(
    externalId: string,
    payload: UpdateAddVehicleDto,
  ): Promise<AddVehicleResponse>;

  deleteAddVehicle(externalId: string): Promise<void>;
}
