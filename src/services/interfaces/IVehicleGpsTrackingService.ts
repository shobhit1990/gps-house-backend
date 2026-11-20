import { GpsLocationData, GpsStatusData, GpsTrackingQuery } from "../../domain/models/GpsTrackingData";
import { GpsTracking } from "../../domain/entities/mongo/GpsTracking";

export interface IVehicleGpsTrackingService {
  recordLocation(data: GpsLocationData): Promise<void>;
  recordLocations(data: GpsLocationData[]): Promise<GpsTracking[]>;
  recordStatus(data: GpsStatusData): Promise<void>;
  getLocations(query: GpsTrackingQuery): Promise<GpsTracking[]>;
  getLatestLocation(deviceImei: string): Promise<GpsTracking | null>;
}

