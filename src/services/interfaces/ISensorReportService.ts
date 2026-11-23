import { SensorReportType } from "../../domain/enums/SensorReportType";
import { AddVehicleResponse } from "./IAddVehicleService";

export type SensorReportQuery = {
  clientId?: string;
  transporterId?: string;
  vehicleId?: string;
  search?: string;
  reportTypes?: SensorReportType[];
  from: Date;
  to: Date;
};

export type SensorReportRow = AddVehicleResponse & {
  sn: number;
  vehicleNo: string;
  type: SensorReportType;
  medium: string;
  createdBy: string | null;
  added: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export interface ISensorReportService {
  getSensorReport(query: SensorReportQuery): Promise<SensorReportRow[]>;
}
