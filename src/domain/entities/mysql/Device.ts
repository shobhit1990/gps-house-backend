import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
} from "@mikro-orm/core";
import { Exclude, Expose } from "class-transformer";
import { v4 as uuidv4 } from "uuid";
import { SimOperator } from "../../enums/SimOperator";
import { Status } from "../../enums/status";
import { Client } from "./Client";
import { DeviceType } from "./DeviceType";

@Entity({ tableName: "device" })
export class Device {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Expose({ name: "id" })
  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @Property({ unique: true, length: 30 })
  imei!: string;

  @Property({ length: 24 })
  simNumber!: string;

  @Enum(() => SimOperator)
  simOperator!: SimOperator;

  @Property({ nullable: true, length: 24 })
  secondarySimNumber?: string | null;

  @Enum({ items: () => SimOperator, nullable: true })
  secondarySimOperator?: SimOperator | null;

  @ManyToOne(() => DeviceType, { nullable: false })
  deviceType!: DeviceType;

  @ManyToOne(() => Client, { nullable: false })
  client!: Client;

  @Exclude()
  @Property({ nullable: true, length: 255 })
  password?: string | null;

  @Enum(() => Status)
  status: Status = Status.ACTIVE;

  @Property({ nullable: true, length: 1000 })
  reason?: string | null;

  @Property({ default: false })
  ignitionWireConnected: boolean = false;

  @Property({ default: false })
  ignitionWireNotConnected: boolean = false;

  @Property({ default: false })
  airConditionWireConnected: boolean = false;

  @Property({ default: false })
  attendance: boolean = false;

  @Property({ default: false })
  timezoneSetting: boolean = false;

  /* ── Live GPS state (written by the GPS realtime queue stage; mirrors dikshank GpsDevice) ── */

  /** Last time shown on the map; also refreshed by heartbeats while ignition is off. */
  @Exclude()
  @Property({ nullable: true })
  locationTime?: Date;

  /**
   * Device time of the last real GPS fix applied to latitude/longitude. Unlike locationTime it is
   * never refreshed by heartbeats, so blind-area re-uploads can be ordered against it.
   */
  @Exclude()
  @Property({ nullable: true })
  lastFixTime?: Date;

  @Exclude()
  @Property({ nullable: true, type: "decimal", precision: 15, scale: 8 })
  latitude?: number;

  @Exclude()
  @Property({ nullable: true, type: "decimal", precision: 15, scale: 8 })
  longitude?: number;

  @Exclude()
  @Property({ nullable: true, type: "decimal", precision: 5, scale: 2 })
  speed?: number;

  @Exclude()
  @Property({ nullable: true, type: "decimal", precision: 5, scale: 2 })
  direction?: number;

  @Exclude()
  @Property({ nullable: true, length: 50 })
  gpsRealTime?: string;

  @Exclude()
  @Property({ nullable: true, length: 50 })
  gpsPositioning?: string;

  @Exclude()
  @Property({ nullable: true, length: 20 })
  mcc?: string;

  @Exclude()
  @Property({ nullable: true, length: 20 })
  mnc?: string;

  @Exclude()
  @Property({ nullable: true, length: 20 })
  lac?: string;

  @Exclude()
  @Property({ nullable: true, length: 30 })
  cellId?: string;

  /** true = ignition on, false = ignition off */
  @Exclude()
  @Property({ nullable: true, default: false })
  ignitionStatus?: boolean;

  @Exclude()
  @Property({ nullable: true, type: "decimal", precision: 12, scale: 2 })
  distance?: number;

  @Exclude()
  @Property({ nullable: true, type: "decimal", precision: 12, scale: 2 })
  distance1?: number;

  /** Cumulative odometer reading in km; advanced only by the realtime GPS stage. */
  @Exclude()
  @Property({ nullable: true, type: "decimal", precision: 12, scale: 2 })
  odometer?: number;

  @Exclude()
  @Property({ nullable: true, type: "number" })
  satellite?: number;

  @Exclude()
  @Property({ nullable: true, length: 10 })
  latitudeType?: string;

  @Exclude()
  @Property({ nullable: true, length: 10 })
  longitudeType?: string;

  @Exclude()
  @Property({ nullable: true, type: "number" })
  batchId?: number;

  @Exclude()
  @Property({ nullable: true, length: 20 })
  terminalInfo?: string;

  @Exclude()
  @Property({ nullable: true })
  oilElectricity?: boolean;

  @Exclude()
  @Property({ nullable: true, length: 10 })
  gpsTracking?: string;

  @Exclude()
  @Property({ nullable: true })
  charging?: boolean;

  @Exclude()
  @Property({ nullable: true, length: 5 })
  ignition?: string;

  @Exclude()
  @Property({ nullable: true, length: 20 })
  defence?: string;

  @Exclude()
  @Property({ nullable: true, length: 20 })
  voltage?: string;

  @Exclude()
  @Property({ nullable: true, length: 20 })
  gsmSignal?: string;

  @Exclude()
  @Property({ nullable: true, length: 20 })
  alarm?: string;

  @Exclude()
  @Property({ nullable: true, length: 20 })
  alarmStatus?: string;

  /** Reverse-geocoded address of the live position (Nominatim), refreshed after real movement. */
  @Exclude()
  @Property({ nullable: true, length: 500 })
  address?: string;

  /** Coordinates the stored `address` was resolved for (to decide when it is stale). */
  @Exclude()
  @Property({ nullable: true, type: "decimal", precision: 15, scale: 8 })
  addressLatitude?: number;

  @Exclude()
  @Property({ nullable: true, type: "decimal", precision: 15, scale: 8 })
  addressLongitude?: number;

  @Exclude()
  @Property({ nullable: true })
  addressUpdatedAt?: Date;

  @ManyToOne(() => Client, { nullable: true })
  createdBy?: Client;

  @ManyToOne(() => Client, { nullable: true })
  updatedBy?: Client;

  @ManyToOne(() => Client, { nullable: true })
  deletedBy?: Client;

  @Exclude()
  @Property({ default: false })
  isDeleted: boolean = false;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property({ nullable: true })
  deletedAt?: Date;
}
