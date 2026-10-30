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
import { AssignType } from "../../enums/AssignType";
import { InventoryType } from "../../enums/InventoryType";
import { SimOperator } from "../../enums/SimOperator";
import { Status } from "../../enums/status";
import { Client } from "./Client";
import { DeviceType } from "./DeviceType";
import { Technician } from "./Technician";

@Entity({ tableName: "add_inventory" })
export class AddInventory {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Expose({ name: "id" })
  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @Enum(() => InventoryType)
  inventoryType!: InventoryType;

  @Property({ nullable: true, unique: true, length: 30 })
  imei?: string | null;

  @Property({ nullable: true, length: 24 })
  simNumber?: string | null;

  @Enum(() => SimOperator)
  simOperator!: SimOperator;

  @Property({ nullable: true, length: 24 })
  secondarySimNumber?: string | null;

  @Enum({ items: () => SimOperator, nullable: true })
  secondarySimOperator?: SimOperator | null;

  @ManyToOne(() => DeviceType, { nullable: false })
  deviceType!: DeviceType;

  @Enum(() => AssignType)
  assignType!: AssignType;

  @ManyToOne(() => Client, { nullable: true })
  client?: Client;

  @ManyToOne(() => Technician, { nullable: true })
  technician?: Technician;

  @Exclude()
  @Property({ nullable: true, length: 255 })
  password?: string | null;

  @Property({ default: false })
  ignitionWireConnected: boolean = false;

  @Property({ default: false })
  airConditionWireConnected: boolean = false;

  @Property({ default: false })
  analogSensor: boolean = false;

  @ManyToOne(() => Client, { nullable: true })
  createdBy?: Client;

  @ManyToOne(() => Client, { nullable: true })
  updatedBy?: Client;

  @ManyToOne(() => Client, { nullable: true })
  deletedBy?: Client;

  @Enum({ items: () => Status, nullable: true })
  status?: Status | null;

  @Property({ nullable: true, length: 1000 })
  reason?: string | null;

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
