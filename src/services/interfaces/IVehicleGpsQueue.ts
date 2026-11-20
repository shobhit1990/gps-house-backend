import { GpsLocationData, GpsStatusData } from "../../domain/models/GpsTrackingData";

export interface IVehicleGpsQueue {
  enqueueLocation(data: GpsLocationData): Promise<void>;
  enqueueLocations(data: GpsLocationData[]): Promise<void>;
  enqueueStatus(data: GpsStatusData): Promise<void>;
  startProcessing(): Promise<void>;
  stopProcessing(): Promise<void>;
  getQueueSize(): Promise<number>;
}

