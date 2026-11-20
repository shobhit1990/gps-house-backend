import { inject, injectable } from "tsyringe";
import { EntityManager, MongoConnection } from "@mikro-orm/mongodb";
import { Filter, ObjectId } from "mongodb";
import { IVehicleGpsQueueRepository } from "../../../../domain/repositories/mongo/IVehicleGpsQueueRepository";
import { GpsQueueItem } from "../../../../domain/entities/mongo/VehicleGpsQueueItem";
import { GpsLocationData, GpsStatusData } from "../../../../domain/models/GpsTrackingData";
import { logger } from "../../../../configs/logger";

/**
 * Two Mongo collections (same as dikshank-backend):
 *  - gps_realtime_queue: one row per IMEI+type (upserted), so the live map always processes
 *    only the newest point and a backlog can never delay it.
 *  - gps_report_queue: append-only, every point, feeds history storage.
 */
const REALTIME_QUEUE_COLLECTION = "gps_realtime_queue";
const REPORT_QUEUE_COLLECTION = "gps_report_queue";
const MAX_QUEUE_RETRIES = Number(process.env.GPS_QUEUE_MAX_RETRIES) || 3;

type StoredGpsQueueItem = GpsQueueItem & {
  queueKey?: string;
  processingToken?: string;
};

@injectable()
export class VehicleGpsQueueRepository implements IVehicleGpsQueueRepository {
  private collectionsInitialized = false;

  constructor(@inject(EntityManager) private readonly em: EntityManager) {}

  private get connection(): MongoConnection {
    return this.em.getConnection() as MongoConnection;
  }

  private get realtimeCollection() {
    return this.connection.getCollection<StoredGpsQueueItem>(REALTIME_QUEUE_COLLECTION);
  }

  private get reportCollection() {
    return this.connection.getCollection<StoredGpsQueueItem>(REPORT_QUEUE_COLLECTION);
  }

  private async ensureCollection(): Promise<void> {
    if (this.collectionsInitialized) {
      return;
    }
    try {
      const existing = await this.connection.listCollections();
      if (!existing.includes(REALTIME_QUEUE_COLLECTION)) {
        await this.connection.getDb().createCollection(REALTIME_QUEUE_COLLECTION);
      }
      if (!existing.includes(REPORT_QUEUE_COLLECTION)) {
        await this.connection.getDb().createCollection(REPORT_QUEUE_COLLECTION);
      }

      await this.realtimeCollection.createIndex({ status: 1, createdAt: 1 });
      await this.realtimeCollection.createIndex({ clientNamespace: 1, realtimeStatus: 1, createdAt: 1 });
      await this.realtimeCollection.createIndex({ clientNamespace: 1, queueKey: 1 }, { unique: true });

      await this.reportCollection.createIndex({ status: 1, createdAt: 1 });
      await this.reportCollection.createIndex({ clientNamespace: 1, reportStatus: 1, createdAt: 1 });
      this.collectionsInitialized = true;
    } catch (error) {
      logger.error("Error ensuring GPS queue collection:", error);
      // Continue anyway - collection might already exist
      this.collectionsInitialized = true;
    }
  }

  async enqueueLocation(data: GpsLocationData, clientNamespace: string): Promise<GpsQueueItem> {
    await this.ensureCollection();
    const realtimeItem = this.createQueueItem("location", data, clientNamespace, {
      reportStatus: "completed",
    });
    await this.upsertRealtimeItem(this.buildRealtimeQueueKey("location", data.deviceImei), realtimeItem);
    const reportItem = await this.insertReportItem("location", data, clientNamespace);
    logger.info("Vehicle GPS location enqueued", {
      clientNamespace,
      deviceImei: data.deviceImei,
      vehicleId: data.vehicleId,
      locationTime: data.locationTime?.toISOString?.() ?? data.locationTime,
      realtimeQueue: REALTIME_QUEUE_COLLECTION,
      reportQueue: REPORT_QUEUE_COLLECTION,
      reportItemId: reportItem._id.toString(),
    });
    return realtimeItem;
  }

  async enqueueLocations(data: GpsLocationData[], clientNamespace: string): Promise<GpsQueueItem> {
    await this.ensureCollection();
    const latestByImei = new Map<string, GpsLocationData>();
    for (const location of data) {
      const existing = latestByImei.get(location.deviceImei);
      if (!existing || location.locationTime > existing.locationTime) {
        latestByImei.set(location.deviceImei, location);
      }
    }

    const realtimeItems = Array.from(latestByImei.values()).map((location) => {
      const item = this.createQueueItem("location", location, clientNamespace, {
        reportStatus: "completed",
      });
      return {
        key: this.buildRealtimeQueueKey("location", location.deviceImei),
        item,
      };
    });

    await Promise.all(realtimeItems.map(({ key, item }) => this.upsertRealtimeItem(key, item)));
    const reportItem = await this.insertReportItem("locations", data, clientNamespace);
    return realtimeItems[0]?.item ?? reportItem;
  }

  async enqueueStatus(data: GpsStatusData, clientNamespace: string): Promise<GpsQueueItem> {
    await this.ensureCollection();
    const realtimeItem = this.createQueueItem("status", data, clientNamespace, {
      reportStatus: "completed",
    });
    await this.upsertRealtimeItem(this.buildRealtimeQueueKey("status", data.deviceImei), realtimeItem);
    await this.insertReportItem("status", data, clientNamespace);
    return realtimeItem;
  }

  async getPendingRealtimeItems(clientNamespace: string, limit: number): Promise<GpsQueueItem[]> {
    await this.ensureCollection();
    const now = new Date();
    return await this.realtimeCollection
      .find({
        clientNamespace,
        $or: [
          {
            realtimeStatus: "pending",
            ...this.buildAvailableLockFilter(now),
          },
          {
            realtimeStatus: "processing",
            lockUntil: { $lte: now },
          },
        ],
      })
      .sort({ createdAt: 1 })
      .limit(limit)
      .toArray();
  }

  async getPendingReportItems(
    clientNamespace: string,
    limit: number,
    order: "oldest" | "newest" = "oldest",
  ): Promise<GpsQueueItem[]> {
    await this.ensureCollection();
    const now = new Date();
    const processingToken = new ObjectId().toHexString();
    const claimFilter = this.buildReportClaimFilter(clientNamespace, now);
    const sort = order === "newest" ? { createdAt: -1 as const } : { createdAt: 1 as const };
    const candidates = await this.reportCollection.find(claimFilter).sort(sort).limit(limit).toArray();

    if (candidates.length === 0) {
      return [];
    }

    // Claim each candidate atomically so several report workers/processes never share an item.
    await this.reportCollection.bulkWrite(
      candidates.map((item) => ({
        updateOne: {
          filter: {
            _id: item._id,
            ...claimFilter,
          },
          update: {
            $set: {
              status: "processing",
              reportStatus: "processing",
              processingToken,
              lockUntil: this.getLockUntil(),
              updatedAt: now,
            },
            $unset: { reportError: "" },
          },
        },
      })),
      { ordered: false },
    );

    return await this.reportCollection
      .find({ clientNamespace, reportStatus: "processing", processingToken })
      .sort({ createdAt: 1 })
      .toArray();
  }

  async markRealtimeProcessing(itemIds: ObjectId[]): Promise<string> {
    await this.ensureCollection();
    const processingToken = new ObjectId().toHexString();
    await this.realtimeCollection.updateMany(
      { _id: { $in: itemIds } },
      {
        $set: {
          processingToken,
          realtimeStatus: "processing",
          lockUntil: this.getLockUntil(),
        },
        $unset: { realtimeError: "" },
      },
    );
    return processingToken;
  }

  async markRealtimeCompleted(items: GpsQueueItem[], processingToken: string): Promise<void> {
    await this.ensureCollection();
    if (items.length === 0) {
      return;
    }

    // Matching on processingToken keeps a newer point that was upserted mid-processing
    // (the upsert clears the token), so it is processed on the next tick instead of deleted.
    await this.realtimeCollection.deleteMany({
      _id: { $in: items.map((item) => item._id) },
      processingToken,
    });
  }

  async markRealtimeFailed(itemId: ObjectId, error: string, processingToken: string): Promise<void> {
    await this.ensureCollection();
    const item = await this.realtimeCollection.findOne({ _id: itemId, processingToken });
    if (!item) {
      return;
    }

    const retryCount = (item.retryCount ?? 0) + 1;
    const shouldRetry = retryCount <= MAX_QUEUE_RETRIES;

    await this.realtimeCollection.updateOne(
      { _id: itemId, processingToken },
      {
        $set: {
          status: shouldRetry ? "pending" : "failed",
          realtimeStatus: shouldRetry ? "pending" : "failed",
          realtimeError: error,
          error,
          retryCount,
          updatedAt: new Date(),
          ...(shouldRetry ? {} : { lockUntil: this.getLockUntil() }),
        },
        ...(shouldRetry ? { $unset: { lockUntil: "", processingToken: "" } } : {}),
      },
    );
  }

  async markReportCompleted(itemIds: ObjectId[]): Promise<void> {
    await this.ensureCollection();
    if (itemIds.length === 0) {
      return;
    }

    await this.reportCollection.deleteMany({
      _id: { $in: itemIds },
    });
  }

  async markReportFailed(itemId: ObjectId, error: string): Promise<void> {
    await this.ensureCollection();
    const item = await this.reportCollection.findOne({ _id: itemId });
    if (!item) {
      return;
    }

    const retryCount = (item.retryCount ?? 0) + 1;
    const shouldRetry = retryCount <= MAX_QUEUE_RETRIES;

    await this.reportCollection.updateOne(
      { _id: itemId },
      {
        $set: {
          status: shouldRetry ? "pending" : "failed",
          reportStatus: shouldRetry ? "pending" : "failed",
          reportError: error,
          error,
          retryCount,
          updatedAt: new Date(),
          ...(shouldRetry ? {} : { lockUntil: this.getLockUntil() }),
        },
        ...(shouldRetry ? { $unset: { lockUntil: "", processingToken: "" } } : {}),
      },
    );
  }

  async resetStaleProcessingJobs(clientNamespace: string): Promise<{ realtime: number; report: number }> {
    await this.ensureCollection();
    const now = new Date();

    await Promise.all([
      this.realtimeCollection.updateMany(
        { clientNamespace, realtimeStatus: "pending", lockUntil: null } as unknown as Filter<StoredGpsQueueItem>,
        { $unset: { lockUntil: "" } },
      ),
      this.reportCollection.updateMany(
        { clientNamespace, reportStatus: "pending", lockUntil: null } as unknown as Filter<StoredGpsQueueItem>,
        { $unset: { lockUntil: "" } },
      ),
    ]);

    const [realtimeResult, reportResult] = await Promise.all([
      this.realtimeCollection.updateMany(
        {
          clientNamespace,
          $or: [
            { realtimeStatus: "processing", lockUntil: { $lte: now } },
            { realtimeStatus: "failed", retryCount: { $lte: MAX_QUEUE_RETRIES } },
          ],
        },
        {
          $set: {
            status: "pending",
            realtimeStatus: "pending",
            updatedAt: now,
          },
          $unset: { lockUntil: "", processingToken: "", realtimeError: "", error: "" },
        },
      ),
      this.reportCollection.updateMany(
        {
          clientNamespace,
          $or: [
            { reportStatus: "processing", lockUntil: { $lte: now } },
            { reportStatus: "failed", retryCount: { $lte: MAX_QUEUE_RETRIES } },
          ],
        },
        {
          $set: {
            status: "pending",
            reportStatus: "pending",
            updatedAt: now,
          },
          $unset: { lockUntil: "", processingToken: "", reportError: "", error: "" },
        },
      ),
    ]);

    const realtime = realtimeResult.modifiedCount ?? 0;
    const report = reportResult.modifiedCount ?? 0;
    if (realtime > 0 || report > 0) {
      logger.warn("Reset stale vehicle GPS queue jobs", {
        clientNamespace,
        realtime,
        report,
      });
    }

    return { realtime, report };
  }

  async getPendingCount(clientNamespace?: string): Promise<number> {
    await this.ensureCollection();
    const namespaceFilter = clientNamespace ? { clientNamespace } : {};
    const [realtimeCount, reportCount] = await Promise.all([
      this.realtimeCollection.countDocuments({
        ...namespaceFilter,
        realtimeStatus: "pending",
      }),
      this.reportCollection.countDocuments({
        ...namespaceFilter,
        reportStatus: "pending",
      }),
    ]);
    return realtimeCount + reportCount;
  }

  private getLockUntil(): Date {
    const lockMs = Number(process.env.GPS_QUEUE_LOCK_MS) || 60_000;
    return new Date(Date.now() + lockMs);
  }

  private buildAvailableLockFilter(now: Date): { $or: Array<Record<string, unknown>> } {
    return {
      $or: [{ lockUntil: { $exists: false } }, { lockUntil: null }, { lockUntil: { $lte: now } }],
    };
  }

  private buildReportClaimFilter(clientNamespace: string, now: Date): Filter<StoredGpsQueueItem> {
    return {
      clientNamespace,
      $or: [
        {
          reportStatus: "pending",
          ...this.buildAvailableLockFilter(now),
        },
        {
          reportStatus: "processing",
          lockUntil: { $lte: now },
        },
      ],
    };
  }

  private toStoredQueueDocument(item: GpsQueueItem): StoredGpsQueueItem {
    return {
      _id: item._id,
      type: item.type,
      data: item.data,
      clientNamespace: item.clientNamespace,
      status: item.status,
      realtimeStatus: item.realtimeStatus,
      reportStatus: item.reportStatus,
      retryCount: item.retryCount,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private async insertReportItem(
    type: GpsQueueItem["type"],
    data: GpsQueueItem["data"],
    clientNamespace: string,
  ): Promise<GpsQueueItem> {
    const item = this.createQueueItem(type, data, clientNamespace, {
      realtimeStatus: "completed",
    });
    await this.reportCollection.insertOne(this.toStoredQueueDocument(item));
    return item;
  }

  private createQueueItem(
    type: GpsQueueItem["type"],
    data: GpsQueueItem["data"],
    clientNamespace: string,
    overrides: Partial<Pick<GpsQueueItem, "status" | "realtimeStatus" | "reportStatus">> = {},
  ): GpsQueueItem {
    const item = new GpsQueueItem({
      type,
      data,
      clientNamespace,
      status: overrides.status ?? "pending",
      realtimeStatus: overrides.realtimeStatus ?? "pending",
      reportStatus: overrides.reportStatus ?? "pending",
    });
    item._id = new ObjectId();
    return item;
  }

  private async upsertRealtimeItem(queueKey: string, item: GpsQueueItem): Promise<void> {
    await this.realtimeCollection.updateOne(
      {
        clientNamespace: item.clientNamespace,
        queueKey,
      },
      {
        $set: {
          type: item.type,
          data: item.data,
          clientNamespace: item.clientNamespace,
          queueKey,
          status: "pending",
          realtimeStatus: "pending",
          reportStatus: "completed",
          retryCount: 0,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          _id: item._id,
          createdAt: item.createdAt,
        },
        $unset: {
          lockUntil: "",
          error: "",
          realtimeError: "",
          reportError: "",
          processingToken: "",
          processedAt: "",
        },
      },
      { upsert: true },
    );
  }

  private buildRealtimeQueueKey(type: "location" | "status", deviceImei: string): string {
    return `${type}:${deviceImei}`;
  }
}
