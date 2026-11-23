import { DurationMinutes } from "../../domain/enums/DurationMinutes";
import { AddVehicleResponse } from "./IAddVehicleService";

export type RideReportQuery = {
  clientId?: string;
  transporterId?: string;
  vehicleId?: string;
  search?: string;
  durationMinutes: DurationMinutes;
  from: Date;
  to: Date;
};

export type RideReportRow = AddVehicleResponse & {
  sn: number;
  vehicleNo: string;
  startDateTime: string;
  startCoordinate: string | null;
  sPoi: string | null;
  startAddress: string | null;
  endDateTime: string;
  endCoordinate: string | null;
  ePoi: string | null;
  endAddress: string | null;
  durationMinutes: number;
  startLatitude: number | null;
  startLongitude: number | null;
  endLatitude: number | null;
  endLongitude: number | null;
};

export interface IRideReportService {
  getRideReport(query: RideReportQuery): Promise<RideReportRow[]>;
}
