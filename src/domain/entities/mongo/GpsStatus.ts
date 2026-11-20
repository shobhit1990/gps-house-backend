import { Entity, PrimaryKey, Property, Index } from "@mikro-orm/core";
import { ObjectId } from "mongodb";

@Entity({ collection: "vehicleGpsStatus" })
@Index({ properties: ["deviceImei", "createdAt"] })
@Index({ properties: ["deviceImei"] })
@Index({ properties: ["vehicleId", "createdAt"] })
export class GpsStatus {
  @PrimaryKey()
  _id!: ObjectId;

  @Property()
  deviceImei!: string;

  @Property()
  vehicleId!: string;

  @Property()
  vehicleNumber!: string;

  @Property({ nullable: true })
  terminalInfo?: string;

  @Property({ nullable: true, type: "boolean" })
  oilElectricity?: boolean;

  @Property({ nullable: true })
  gpsTracking?: string;

  @Property({ nullable: true })
  alarmStatus?: string;

  @Property({ nullable: true })
  alarm?: string;

  @Property({ nullable: true, type: "boolean" })
  charging?: boolean;

  @Property({ nullable: true })
  ignition?: string;

  @Property({ nullable: true })
  defence?: string;

  @Property({ nullable: true })
  voltage?: string;

  @Property({ nullable: true })
  gsmSignal?: string;

  @Property({ nullable: true, type: "json" })
  metadata?: Record<string, unknown>;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  constructor(init: {
    deviceImei: string;
    vehicleId: string;
    vehicleNumber: string;
    terminalInfo?: string;
    oilElectricity?: boolean;
    gpsTracking?: string;
    alarmStatus?: string;
    alarm?: string;
    charging?: boolean;
    ignition?: string;
    defence?: string;
    voltage?: string;
    gsmSignal?: string;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
  }) {
    this.deviceImei = init.deviceImei;
    this.vehicleId = init.vehicleId;
    this.vehicleNumber = init.vehicleNumber;
    this.terminalInfo = init.terminalInfo;
    this.oilElectricity = init.oilElectricity;
    this.gpsTracking = init.gpsTracking;
    this.alarmStatus = init.alarmStatus;
    this.alarm = init.alarm;
    this.charging = init.charging;
    this.ignition = init.ignition;
    this.defence = init.defence;
    this.voltage = init.voltage;
    this.gsmSignal = init.gsmSignal;
    this.metadata = init.metadata;
    this.createdAt = init.createdAt ?? new Date();
  }
}

