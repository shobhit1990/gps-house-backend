import { VehicleStatus } from "../../domain/enums/VehicleStatus";
import { AddVehicleResponse } from "./IAddVehicleService";

export type StatusReportQuery = {
  clientId?: string;
  transporterId?: string;
  vehicleId?: string;
  search?: string;
  statuses?: VehicleStatus[];
  from: Date;
  to: Date;
};

export type StatusReportRow = AddVehicleResponse & {
  sn: number;
  vehicleNo: string;
  status: VehicleStatus;
  startDateTime: string;
  startAddress: string | null;
  startCoordinate: string | null;
  endDateTime: string;
  endAddress: string | null;
  endCoordinate: string | null;
  sPoi: string | null;
  ePoi: string | null;
  startLatitude: number | null;
  startLongitude: number | null;
  endLatitude: number | null;
  endLongitude: number | null;
};

export interface IStatusReportService {
  getStatusReport(query: StatusReportQuery): Promise<StatusReportRow[]>;
}
