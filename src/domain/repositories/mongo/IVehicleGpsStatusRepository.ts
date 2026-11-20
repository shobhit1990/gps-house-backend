import { GpsStatusData } from "../../models/GpsTrackingData";
import { GpsStatus } from "../../entities/mongo/GpsStatus";

export interface IVehicleGpsStatusRepository {
  createStatus(data: GpsStatusData): Promise<GpsStatus>;
  findLatestStatus(deviceImei: string): Promise<GpsStatus | null>;
}

