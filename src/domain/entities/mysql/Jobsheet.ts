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
import { Status } from "../../enums/status";
import { AddVehicle } from "./AddVehicle";
import { Client } from "./Client";
import { Technician } from "./Technician";

@Entity({ tableName: "jobsheet" })
export class Jobsheet {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Expose({ name: "id" })
  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @Expose()
  @ManyToOne(() => AddVehicle, { fieldName: "vehicle", nullable: true })
  vehicle?: AddVehicle;

  @Expose()
  @ManyToOne(() => Technician, { fieldName: "technician", nullable: false })
  technician!: Technician;

  @Property({ nullable: false })
  contactPersonName!: string;

  @Property({ nullable: false, length: 30 })
  phone!: string;

  @Property({ nullable: true, length: 255 })
  orderNo?: string;

  @Property({ nullable: true, type: "text" })
  instruction?: string;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  createdBy?: Client;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  updatedBy?: Client;

  @Enum({ items: () => Status, nullable: true })
  status?: Status;

  @Property({ nullable: true })
  reason?: string;

  @Exclude()
  @Property({ default: false })
  isDeleted: boolean = false;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  deletedBy?: Client;

  @Exclude()
  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Exclude()
  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
