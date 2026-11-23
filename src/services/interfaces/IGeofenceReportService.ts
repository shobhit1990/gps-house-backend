import { Duration } from "../../domain/enums/Duration";
import { AddVehicleResponse } from "./IAddVehicleService";

export type GeofenceReportQuery = {
  clientId?: string;
  transporterId?: string;
  vehicleId?: string;
  search?: string;
  duration: Duration;
  from: Date;
  to: Date;
};

export type GeofenceReportRow = AddVehicleResponse & {
  sn: number;
  vehicleNo: string;
  geoName: string;
  inTime: string;
  outTime: string;
  inLoc: string | null;
  outLoc: string | null;
  inAddress: string | null;
  outAddress: string | null;
  haltTimeMinutes: number;
  distanceMeters: number;
  distanceKm: number;
  reportType: string | null;
  remark: string | null;
  geofenceId: string;
  inLatitude: number | null;
  inLongitude: number | null;
  outLatitude: number | null;
  outLongitude: number | null;
};

export interface IGeofenceReportService {
  getGeofenceReport(query: GeofenceReportQuery): Promise<GeofenceReportRow[]>;
}
