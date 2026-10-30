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
