import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
} from "@mikro-orm/core";
import { Exclude } from "class-transformer";
import { v4 as uuidv4 } from "uuid";
import { AlertOperation } from "../../enums/AlertOperation";
import { GeofenceRestrictionType } from "../../enums/GeofenceRestrictionType";
import { Status } from "../../enums/status";
import { TripRestrictionType } from "../../enums/TripRestrictionType";
import { Client } from "./Client";
import { SensorMaster } from "./SensorMaster";

@Entity({ tableName: "custom_alerts" })
export class CustomAlert {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @Property({ nullable: false, length: 255 })
  alertName!: string;

  @ManyToOne(() => SensorMaster, { nullable: true })
  sensor?: SensorMaster | null;

  @Enum(() => AlertOperation)
  operation!: AlertOperation;

  @Property({ nullable: false, length: 255 })
  value!: string;

  @Property({ default: false })
  enableGeofenceRestrictions: boolean = false;

  @Enum({ items: () => GeofenceRestrictionType, nullable: true })
  geofenceSelectType?: GeofenceRestrictionType | null;

  @Property({ default: false })
  enableTripRestrictions: boolean = false;

  @Enum({ items: () => TripRestrictionType, nullable: true })
  tripSelectType?: TripRestrictionType | null;

  @Property({ nullable: false, length: 255 })
  subject!: string;

  @Property({ type: "text" })
  messageBody!: string;

  @Property({ default: false })
  mobile: boolean = false;

  @Enum(() => Status)
  status: Status = Status.ACTIVE;

  @Property({ nullable: true, length: 1000 })
  reason?: string | null;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  createdBy?: Client;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  updatedBy?: Client;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  deletedBy?: Client;

  @Exclude()
  @Property({ default: false })
  isDeleted: boolean = false;

  @Exclude()
  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Exclude()
  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Exclude()
  @Property({ nullable: true })
  deletedAt?: Date;
}
