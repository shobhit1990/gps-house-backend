import { inject, injectable } from "tsyringe";
import { IVehicleGpsQueue } from "./interfaces/IVehicleGpsQueue";
import { IVehicleGpsTrackingService } from "./interfaces/IVehicleGpsTrackingService";
import { IVehicleGpsDeviceService } from "./interfaces/IVehicleGpsDeviceService";
import { IVehicleGpsQueueRepository } from "../domain/repositories/mongo/IVehicleGpsQueueRepository";
import { GpsLocationData, GpsStatusData } from "../domain/models/GpsTrackingData";
import { GpsQueueItem } from "../domain/entities/mongo/VehicleGpsQueueItem";
import { logger } from "../configs/logger";
import { getClientNamespace } from "../utils/clientNamespace";
import { isVehicleGpsRuntimeEnabled } from "../utils/vehicleGpsRuntime";

const SKIP_LOG_INTERVAL_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Two-stage vehicle GPS queue (port of dikshank-backend VehicleGpsQueue):
 *  - realtime stage (gps-worker): newest point per IMEI → Device live columns + socket push
 *  - report stage (gps-report-worker): every point → monthly Mongo history collections
 * A slow history write therefore never delays the live map.
 */
@injectable()
export class VehicleGpsQueue implements IVehicleGpsQueue {
  private isProcessing = false;
  private isRealtimeProcessing = false;
  private activeReportWorkers = 0;
  private realtimeProcessingStartedAt = 0;
  private reportProcessingStartedAt = 0;
  private lastRealtimeSkipLogAt = 0;
  private lastReportSkipLogAt = 0;
  private realtimeInterval: NodeJS.Timeout | null = null;
  private reportInterval: NodeJS.Timeout | null = null;
  private readonly realtimeBatchSize: number;
  private readonly reportBatchSize: number;
  private readonly realtimeIntervalMs: number;
  private readonly reportIntervalMs: number;
  private readonly reportWorkerCount: number;
  private readonly realtimeProcessorEnabled: boolean;
  private readonly reportProcessorEnabled: boolean;
  private readonly clientNamespace: string;

  constructor(
    @inject("IVehicleGpsTrackingService")
    private readonly vehicleGpsTrackingService: IVehicleGpsTrackingService,
    @inject("IVehicleGpsQueueRepository")
    private readonly vehicleGpsQueueRepository: IVehicleGpsQueueRepository,
    @inject("IVehicleGpsDeviceService")
    private readonly vehicleGpsDeviceService: IVehicleGpsDeviceService,
  ) {
    this.realtimeBatchSize = Number(process.env.GPS_REALTIME_BATCH_SIZE) || 20;
    this.reportBatchSize = Number(process.env.GPS_REPORT_BATCH_SIZE) || 20;
    this.realtimeIntervalMs = Number(process.env.GPS_REALTIME_INTERVAL_MS) || 1000;
    this.reportIntervalMs =
      Number(process.env.GPS_REPORT_INTERVAL_MS) || Number(process.env.GPS_QUEUE_INTERVAL_MS) || 5000;
    this.reportWorkerCount = Math.min(Math.max(Number(process.env.GPS_REPORT_WORKER_COUNT) || 1, 1), 10);
    this.realtimeProcessorEnabled = process.env.GPS_REALTIME_PROCESSOR_ENABLED !== "false";
    this.reportProcessorEnabled = process.env.GPS_REPORT_PROCESSOR_ENABLED !== "false";
    this.clientNamespace = getClientNamespace();
  }

  async enqueueLocation(data: GpsLocationData): Promise<void> {
    await this.vehicleGpsQueueRepository.enqueueLocation(data, this.clientNamespace);
    logger.debug(`GPS location enqueued for device: ${data.deviceImei}`);
  }

  async enqueueLocations(data: GpsLocationData[]): Promise<void> {
    if (data.length === 0) {
      return;
    }

    await this.vehicleGpsQueueRepository.enqueueLocations(data, this.clientNamespace);
    logger.debug(`GPS locations enqueued: ${data.length} records`);
  }

  async enqueueStatus(data: GpsStatusData): Promise<void> {
    await this.vehicleGpsQueueRepository.enqueueStatus(data, this.clientNamespace);
    logger.debug(`GPS status enqueued for device: ${data.deviceImei}`);
  }

  async startProcessing(): Promise<void> {
    if (!isVehicleGpsRuntimeEnabled()) {
      logger.info("Vehicle GPS runtime is disabled; queue processors not started");
      return;
    }

    if (this.isProcessing) {
      logger.warn("GPS queue processing is already running");
      return;
    }

    this.isProcessing = true;

    const resetCounts = await this.vehicleGpsQueueRepository.resetStaleProcessingJobs(this.clientNamespace);
    if (resetCounts.realtime > 0 || resetCounts.report > 0) {
      logger.warn(
        `Recovered stale vehicle GPS queue jobs for namespace ${this.clientNamespace}: ` +
          `realtime=${resetCounts.realtime}, report=${resetCounts.report}`,
      );
    }

    logger.info(
      `Starting GPS queue processors for namespace ${this.clientNamespace} ` +
        `(realtime batch: ${this.realtimeBatchSize}, realtime interval: ${this.realtimeIntervalMs}ms, ` +
        `report batch: ${this.reportBatchSize}, report interval: ${this.reportIntervalMs}ms, ` +
        `report workers: ${this.reportWorkerCount}, ` +
        `realtime enabled: ${this.realtimeProcessorEnabled}, report enabled: ${this.reportProcessorEnabled})`,
    );

    if (this.realtimeProcessorEnabled) {
      this.realtimeInterval = setInterval(() => {
        this.processRealtimeQueue().catch((error) => {
          logger.error("Error in GPS realtime queue interval:", error);
        });
      }, this.realtimeIntervalMs);
    }

    if (this.reportProcessorEnabled) {
      this.reportInterval = setInterval(() => {
        this.startReportWorkers();
      }, this.reportIntervalMs);
      this.startReportWorkers();
    }

    await (this.realtimeProcessorEnabled ? this.processRealtimeQueue() : Promise.resolve());
    logger.info("GPS queue processors started successfully");
  }

  async stopProcessing(): Promise<void> {
    if (!this.isProcessing) {
      return;
    }

    this.isProcessing = false;

    if (this.realtimeInterval) {
      clearInterval(this.realtimeInterval);
      this.realtimeInterval = null;
    }

    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }

    // Process remaining realtime items before stopping
    if (this.realtimeProcessorEnabled) {
      await this.processRealtimeQueue();
    }

    logger.info("GPS queue processing stopped");
  }

  async getQueueSize(): Promise<number> {
    return await this.vehicleGpsQueueRepository.getPendingCount(this.clientNamespace);
  }

  private async processRealtimeQueue(): Promise<void> {
    if (this.isRealtimeProcessing) {
      this.logSkippedProcessorTick("realtime");
      return;
    }

    this.isRealtimeProcessing = true;
    this.realtimeProcessingStartedAt = Date.now();
    try {
      const queueItems = await this.vehicleGpsQueueRepository.getPendingRealtimeItems(
        this.clientNamespace,
        this.realtimeBatchSize,
      );

      if (queueItems.length === 0) {
        return;
      }

      const processingToken = await this.vehicleGpsQueueRepository.markRealtimeProcessing(
        queueItems.map((item) => item._id),
      );

      const latestLocationByImei = this.getLatestLocationItemByImei(queueItems);
      const completedItems: GpsQueueItem[] = [];

      for (const item of queueItems) {
        try {
          if (item.type === "status") {
            const status = item.data as GpsStatusData;
            await this.vehicleGpsDeviceService.updateGpsDeviceStatusByImei(status.deviceImei, status);
            completedItems.push(item);
            continue;
          }

          for (const location of this.getLocationsFromItem(item)) {
            const latest = latestLocationByImei.get(location.deviceImei);
            if (latest?.item._id.toString() !== item._id.toString() || latest.location !== location) {
              continue;
            }
            await this.vehicleGpsDeviceService.processLocationRealtime(location.deviceImei, location);
          }

          completedItems.push(item);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          await this.vehicleGpsQueueRepository.markRealtimeFailed(item._id, errorMsg, processingToken);
          logger.error(`Error processing GPS realtime queue item ${item._id}:`, error);
        }
      }

      await this.vehicleGpsQueueRepository.markRealtimeCompleted(completedItems, processingToken);
      logger.debug(`GPS realtime queue processed ${completedItems.length}/${queueItems.length} item(s)`);
    } finally {
      this.isRealtimeProcessing = false;
      this.realtimeProcessingStartedAt = 0;
    }
  }

  private startReportWorkers(): void {
    while (this.activeReportWorkers < this.reportWorkerCount) {
      const workerNumber = this.activeReportWorkers + 1;
      this.processReportQueue(workerNumber).catch((error) => {
        logger.error(`Error in GPS reporting queue worker ${workerNumber}:`, error);
      });
    }
  }

  private async processReportQueue(workerNumber: number): Promise<void> {
    if (this.activeReportWorkers >= this.reportWorkerCount) {
      this.logSkippedProcessorTick("report");
      return;
    }

    this.activeReportWorkers += 1;
    if (this.activeReportWorkers === 1) {
      this.reportProcessingStartedAt = Date.now();
    }
    try {
      while (this.isProcessing && this.reportProcessorEnabled) {
        let processed = false;
        try {
          processed = await this.processReportQueueBatch(workerNumber);
        } catch (error) {
          logger.error(`GPS reporting queue worker ${workerNumber} batch failed:`, error);
        }
        if (!processed) {
          await sleep(this.reportIntervalMs);
        }
      }
    } finally {
      this.activeReportWorkers = Math.max(0, this.activeReportWorkers - 1);
      if (this.activeReportWorkers === 0) {
        this.reportProcessingStartedAt = 0;
      }
    }
  }

  private async processReportQueueBatch(workerNumber: number): Promise<boolean> {
    const reportOrder = workerNumber === 1 ? "newest" : "oldest";
    const queueItems = await this.vehicleGpsQueueRepository.getPendingReportItems(
      this.clientNamespace,
      this.reportBatchSize,
      reportOrder,
    );

    if (queueItems.length === 0) {
      return false;
    }

    logger.info(
      `Processing ${queueItems.length} vehicle GPS reporting queue item(s) on worker ${workerNumber} (${reportOrder})`,
    );

    const locationItems: Array<{
      item: GpsQueueItem;
      historyLocations: GpsLocationData[];
    }> = [];
    const completedItemIds: Array<GpsQueueItem["_id"]> = [];

    for (const item of queueItems) {
      try {
        if (item.type === "status") {
          await this.vehicleGpsTrackingService.recordStatus(item.data as GpsStatusData);
          completedItemIds.push(item._id);
          continue;
        }

        const locations = this.getLocationsFromItem(item);
        const historyLocations = locations.filter((location) => {
          if (!location.vehicleId || !location.vehicleNumber) {
            logger.warn(`Skipping GPS location history for IMEI ${location.deviceImei}: vehicle mapping missing`);
            return false;
          }
          return this.shouldStoreLocationInHistory(location);
        });

        locationItems.push({ item, historyLocations });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        await this.vehicleGpsQueueRepository.markReportFailed(item._id, errorMsg);
        logger.error(`Error processing GPS reporting queue item ${item._id}:`, error);
      }
    }

    const allHistoryLocations = locationItems.flatMap(({ historyLocations }) => historyLocations);
    try {
      if (allHistoryLocations.length > 0) {
        await this.vehicleGpsTrackingService.recordLocations(allHistoryLocations);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await Promise.all(
        locationItems.map(({ item }) => this.vehicleGpsQueueRepository.markReportFailed(item._id, errorMsg)),
      );
      if (completedItemIds.length > 0) {
        await this.vehicleGpsQueueRepository.markReportCompleted(completedItemIds);
      }
      logger.error("Error bulk recording GPS reporting queue locations:", error);
      return true;
    }

    completedItemIds.push(...locationItems.map(({ item }) => item._id));
    if (completedItemIds.length > 0) {
      await this.vehicleGpsQueueRepository.markReportCompleted(completedItemIds);
    }

    logger.info(
      `GPS reporting queue worker ${workerNumber} processed ${completedItemIds.length}/${queueItems.length} item(s)`,
    );
    return true;
  }

  private getLatestLocationItemByImei(
    items: GpsQueueItem[],
  ): Map<string, { item: GpsQueueItem; location: GpsLocationData }> {
    const latest = new Map<string, { item: GpsQueueItem; location: GpsLocationData }>();

    for (const item of items) {
      for (const location of this.getLocationsFromItem(item)) {
        const existing = latest.get(location.deviceImei);
        if (!existing || location.locationTime > existing.location.locationTime) {
          latest.set(location.deviceImei, { item, location });
        }
      }
    }

    return latest;
  }

  private getLocationsFromItem(item: GpsQueueItem): GpsLocationData[] {
    if (item.type === "location") {
      return [item.data as GpsLocationData];
    }

    if (item.type === "locations") {
      return item.data as GpsLocationData[];
    }

    return [];
  }

  /** History keeps moving points only (speed > 0), same as dikshank-backend. */
  private shouldStoreLocationInHistory(location: GpsLocationData): boolean {
    return (
      Number.isFinite(location.latitude) &&
      Number.isFinite(location.longitude) &&
      Number(location.speed ?? 0) > 0 &&
      Boolean(location.vehicleId && location.vehicleNumber)
    );
  }

  private logSkippedProcessorTick(type: "realtime" | "report"): void {
    const now = Date.now();
    const lastLogAt = type === "realtime" ? this.lastRealtimeSkipLogAt : this.lastReportSkipLogAt;
    if (now - lastLogAt < SKIP_LOG_INTERVAL_MS) {
      return;
    }

    const startedAt = type === "realtime" ? this.realtimeProcessingStartedAt : this.reportProcessingStartedAt;
    const runningForMs = startedAt > 0 ? now - startedAt : 0;
    logger.warn(`Skipping GPS ${type} queue tick because previous batch is still running`, {
      runningForMs,
    });

    if (type === "realtime") {
      this.lastRealtimeSkipLogAt = now;
    } else {
      this.lastReportSkipLogAt = now;
    }
  }
}
