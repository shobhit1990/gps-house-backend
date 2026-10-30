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
import { OwnerdBy } from "../../enums/OwnedBy";
import { Status } from "../../enums/status";
import { VehicleBodyType } from "../../enums/VehicleBodyType";
import { AddVehicle } from "./AddVehicle";
import { Client } from "./Client";
import { Transporter } from "./Transporter";

@Entity({ tableName: "vehicle_detail" })
export class VehicleDetail {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Expose({ name: "id" })
  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @ManyToOne(() => Client, { nullable: false })
  client!: Client;

  @ManyToOne(() => Transporter, { nullable: false })
  transporter!: Transporter;

  @ManyToOne(() => AddVehicle, { nullable: false })
  vehicle!: AddVehicle;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  createdBy?: Client;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  updatedBy?: Client;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  deletedBy?: Client;

  @Property({ nullable: true, length: 255 })
  ownerName?: string;

  @Enum({ items: () => OwnerdBy, nullable: true })
  ownedBy?: OwnerdBy;

  @Property({ nullable: true, length: 255 })
  vehicleBrand?: string;

  @Property({ nullable: true, length: 255 })
  vehicleModel?: string;

  @Enum({ items: () => VehicleBodyType, nullable: true })
  vehicleBody?: VehicleBodyType;

  @Property({ type: "double", nullable: true })
  capacity?: number;

  @Property({ type: "date", nullable: true })
  manufactureDate?: Date;

  @Property({ type: "date", nullable: true })
  purchaseDate?: Date;

  @Enum({ items: () => Status, nullable: true })
  status?: Status;

  @Property({ nullable: true, length: 1000 })
  reason?: string;

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
