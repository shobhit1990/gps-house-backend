import { GpsLocationData, GpsTrackingQuery } from "../../models/GpsTrackingData";
import { GpsTracking } from "../../entities/mongo/GpsTracking";
import { VehicleGpsTrackingLatestDocument } from "../../models/VehicleGpsTrackingLatest";
import { TravelTrackPoint } from "../../models/TravelSummary";

export interface IVehicleGpsTrackingRepository {
  createLocation(data: GpsLocationData): Promise<GpsTracking>;
  createLocations(data: GpsLocationData[]): Promise<GpsTracking[]>;
  findLocations(query: GpsTrackingQuery): Promise<GpsTracking[]>;
  findLatestLocation(deviceImei: string): Promise<GpsTracking | null>;
  findLatestLocations(recordedAfter?: Date): Promise<VehicleGpsTrackingLatestDocument[]>;
  findTravelPoints(query: {
    vehicleIds: string[];
    from: Date;
    to: Date;
    limit?: number;
  }): Promise<TravelTrackPoint[]>;
  sumDistanceByDeviceImeis(query: {
    deviceImeis: string[];
    from: Date;
    to: Date;
  }): Promise<Record<string, number>>;
}

