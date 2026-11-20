import { ObjectId } from "mongodb";
import { GpsQueueItem } from "../../entities/mongo/VehicleGpsQueueItem";
import { GpsLocationData, GpsStatusData } from "../../models/GpsTrackingData";

export interface IVehicleGpsQueueRepository {
  enqueueLocation(data: GpsLocationData, clientNamespace: string): Promise<GpsQueueItem>;
  enqueueLocations(data: GpsLocationData[], clientNamespace: string): Promise<GpsQueueItem>;
  enqueueStatus(data: GpsStatusData, clientNamespace: string): Promise<GpsQueueItem>;
  getPendingRealtimeItems(clientNamespace: string, limit: number): Promise<GpsQueueItem[]>;
  getPendingReportItems(
    clientNamespace: string,
    limit: number,
    order?: "oldest" | "newest",
  ): Promise<GpsQueueItem[]>;
  markRealtimeProcessing(itemIds: ObjectId[]): Promise<string>;
  markRealtimeCompleted(items: GpsQueueItem[], processingToken: string): Promise<void>;
  markRealtimeFailed(itemId: ObjectId, error: string, processingToken: string): Promise<void>;
  markReportCompleted(itemIds: ObjectId[]): Promise<void>;
  markReportFailed(itemId: ObjectId, error: string): Promise<void>;
  resetStaleProcessingJobs(clientNamespace: string): Promise<{ realtime: number; report: number }>;
  getPendingCount(clientNamespace?: string): Promise<number>;
}
