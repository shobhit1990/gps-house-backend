import { Entity, PrimaryKey, Property, Index } from "@mikro-orm/core";
import { ObjectId } from "mongodb";
import { GpsLocationData, GpsStatusData } from "../../models/GpsTrackingData";

export type GpsQueueStageStatus = "pending" | "processing" | "completed" | "failed";
export type GpsQueueItemType = "location" | "locations" | "status";
export type GpsQueueItemData = GpsLocationData | GpsLocationData[] | GpsStatusData;

@Entity({ collection: "gps_queue" })
@Index({ properties: ["status", "createdAt"] })
@Index({ properties: ["status"] })
@Index({ properties: ["clientNamespace", "realtimeStatus", "createdAt"] })
@Index({ properties: ["clientNamespace", "reportStatus", "createdAt"] })
export class GpsQueueItem {
  @PrimaryKey()
  _id!: ObjectId;

  @Property()
  type!: GpsQueueItemType;

  @Property({ type: "json" })
  data!: GpsQueueItemData;

  @Property()
  clientNamespace!: string;

  @Property()
  status: GpsQueueStageStatus = "pending";

  @Property()
  realtimeStatus: GpsQueueStageStatus = "pending";

  @Property()
  reportStatus: GpsQueueStageStatus = "pending";

  @Property()
  retryCount = 0;

  @Property({ nullable: true })
  lockUntil?: Date;

  @Property({ nullable: true })
  error?: string;

  @Property({ nullable: true })
  realtimeError?: string;

  @Property({ nullable: true })
  reportError?: string;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property({ nullable: true })
  processedAt?: Date;

  constructor(init: {
    type: GpsQueueItemType;
    data: GpsQueueItemData;
    clientNamespace: string;
    status?: GpsQueueStageStatus;
    realtimeStatus?: GpsQueueStageStatus;
    reportStatus?: GpsQueueStageStatus;
    retryCount?: number;
    lockUntil?: Date;
    error?: string;
    realtimeError?: string;
    reportError?: string;
    createdAt?: Date;
    updatedAt?: Date;
    processedAt?: Date;
  }) {
    this.type = init.type;
    this.data = init.data;
    this.clientNamespace = init.clientNamespace;
    this.status = init.status || "pending";
    this.realtimeStatus = init.realtimeStatus || "pending";
    this.reportStatus = init.reportStatus || "pending";
    this.retryCount = init.retryCount ?? 0;
    this.lockUntil = init.lockUntil;
    this.error = init.error;
    this.realtimeError = init.realtimeError;
    this.reportError = init.reportError;
    this.createdAt = init.createdAt ?? new Date();
    this.updatedAt = init.updatedAt ?? new Date();
    this.processedAt = init.processedAt;
  }
}

