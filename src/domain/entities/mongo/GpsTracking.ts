import { Entity, PrimaryKey, Property, Index } from "@mikro-orm/core";
import { ObjectId } from "mongodb";

@Entity({ collection: "vehicleGpsTracking" })
@Index({ properties: ["deviceImei", "locationTime"] })
@Index({ properties: ["deviceImei"] })
@Index({ properties: ["vehicleId", "locationTime"] })
@Index({ properties: ["vehicleNumber", "locationTime"] })
@Index({ properties: ["locationTime"] })
export class GpsTracking {
  @PrimaryKey()
  _id!: ObjectId;

  @Property()
  deviceImei!: string;

  @Property()
  vehicleId!: string;

  @Property()
  vehicleNumber!: string;

  @Property()
  locationTime!: Date;

  @Property({ type: "decimal" })
  latitude!: number;

  @Property({ type: "decimal" })
  longitude!: number;

  @Property({ nullable: true, type: "number" })
  speed?: number;

  @Property({ nullable: true })
  gpsRealTime?: string;

  @Property({ nullable: true })
  gpsPositioning?: string;

  @Property({ nullable: true, type: "number" })
  direction?: number;

  @Property({ nullable: true })
  mcc?: string;

  @Property({ nullable: true })
  mnc?: string;

  @Property({ nullable: true })
  lac?: string;

  @Property({ nullable: true })
  cellId?: string;

  @Property({ nullable: true })
  ignitionStatus?: boolean;

  @Property({ nullable: true, type: "decimal" })
  distance?: number;

  @Property({ nullable: true, type: "decimal" })
  distance1?: number;

  @Property({ nullable: true, type: "number" })
  satellite?: number;

  @Property({ nullable: true })
  latitudeType?: string;

  @Property({ nullable: true })
  longitudeType?: string;

  @Property({ nullable: true, type: "number" })
  batchId?: number;

  /** Reverse-geocoded address near this point (device live address; see VehicleGpsQueue report stage). */
  @Property({ nullable: true })
  address?: string;

  @Property({ nullable: true, type: "json" })
  metadata?: Record<string, unknown>;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  constructor(init: {
    deviceImei: string;
    vehicleId: string;
    vehicleNumber: string;
    locationTime: Date;
    latitude: number;
    longitude: number;
    speed?: number;
    gpsRealTime?: string;
    gpsPositioning?: string;
    direction?: number;
    mcc?: string;
    mnc?: string;
    lac?: string;
    cellId?: string;
    ignitionStatus?: boolean;
    distance?: number;
    distance1?: number;
    satellite?: number;
    latitudeType?: string;
    longitudeType?: string;
    batchId?: number;
    address?: string;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.deviceImei = init.deviceImei;
    this.vehicleId = init.vehicleId;
    this.vehicleNumber = init.vehicleNumber;
    this.locationTime = init.locationTime;
    this.latitude = init.latitude;
    this.longitude = init.longitude;
    this.speed = init.speed;
    this.gpsRealTime = init.gpsRealTime;
    this.gpsPositioning = init.gpsPositioning;
    this.direction = init.direction;
    this.mcc = init.mcc;
    this.mnc = init.mnc;
    this.lac = init.lac;
    this.cellId = init.cellId;
    this.ignitionStatus = init.ignitionStatus;
    this.distance = init.distance;
    this.distance1 = init.distance1;
    this.satellite = init.satellite;
    this.latitudeType = init.latitudeType;
    this.longitudeType = init.longitudeType;
    this.batchId = init.batchId;
    this.address = init.address;
    this.metadata = init.metadata;
    this.createdAt = init.createdAt ?? new Date();
    this.updatedAt = init.updatedAt ?? new Date();
  }
}

