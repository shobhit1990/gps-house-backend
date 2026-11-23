import { GpsLocationData, GpsTrackingQuery } from "../../models/GpsTrackingData";
import { GpsTracking } from "../../entities/mongo/GpsTracking";
import { VehicleGpsTrackingLatestDocument } from "../../models/VehicleGpsTrackingLatest";
import { TravelTrackPoint } from "../../models/TravelSummary";

export type SensorAlarmPoint = {
  vehicleId: string;
  locationTime: Date;
  latitude: number;
  longitude: number;
  address: string | null;
  alarmType: string | null;
  metadata: Record<string, unknown> | null;
};

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
  /** Alarm / sensor packets stored with metadata.isAlarm (does not change travel queries). */
  findSensorAlarmPoints(query: {
    vehicleIds: string[];
    from: Date;
    to: Date;
    limit?: number;
  }): Promise<SensorAlarmPoint[]>;
  sumDistanceByDeviceImeis(query: {
    deviceImeis: string[];
    from: Date;
    to: Date;
  }): Promise<Record<string, number>>;
}

