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
import { Status } from "../../enums/status";
import { AddVehicle } from "./AddVehicle";
import { Client } from "./Client";

@Entity({ tableName: "service_maintenance_details" })
export class ServiceMaintenance {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @Property({ nullable: false, length: 255 })
  serviceName!: string;

  @ManyToOne(() => AddVehicle, { nullable: false })
  vehicle!: AddVehicle;

  @Property({ nullable: true, length: 1000 })
  remark?: string | null;

  @Property({ default: false })
  odometerIntervalEnabled: boolean = false;

  @Property({ type: "double", nullable: true })
  odometerInterval?: number | null;

  @Property({ type: "double", nullable: true })
  lastServiceOdometer?: number | null;

  @Property({ default: false })
  engineIntervalEnabled: boolean = false;

  @Property({ type: "double", nullable: true })
  engineInterval?: number | null;

  @Property({ type: "double", nullable: true })
  lastServiceEngine?: number | null;

  @Property({ default: false })
  daysIntervalEnabled: boolean = false;

  @Property({ type: "int", nullable: true })
  daysInterval?: number | null;

  @Property({ type: "date", nullable: true })
  lastServiceDate?: Date | null;

  @Property({ default: false })
  odometerLeftEnabled: boolean = false;

  @Property({ type: "double", nullable: true })
  odometerLeft?: number | null;

  @Property({ default: false })
  engineLeftEnabled: boolean = false;

  @Property({ type: "double", nullable: true })
  engineLeft?: number | null;

  @Property({ default: false })
  daysLeftEnabled: boolean = false;

  @Property({ type: "int", nullable: true })
  daysLeft?: number | null;

  @Property({ default: false })
  updateRecord: boolean = false;

  @Property({ default: false })
  mobile: boolean = false;

  @Property({ nullable: true, length: 1000 })
  serviceDocument?: string | null;

  @Property({ default: false })
  allowVisibilityToDriver: boolean = false;

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
