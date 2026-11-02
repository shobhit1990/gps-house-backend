import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
} from "@mikro-orm/core";
import { v4 as uuidv4 } from "uuid";
import { Status } from "../../enums/status";
import { AddVehicle } from "./AddVehicle";
import { Client } from "./Client";
import { District } from "./District";
import { State } from "./State";

@Entity({ tableName: "certificate_add" })
export class CertificateAdd {
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @ManyToOne(() => AddVehicle, { nullable: false })
  vehicleNumber!: AddVehicle;

  @Property({ type: "int", nullable: true })
  numberOfSos?: number | null;

  @Property({ type: "date", nullable: true })
  deviceInstallationDate?: Date | null;

  @Property({ nullable: true, length: 255 })
  chassisNumber?: string | null;

  @Property({ nullable: true, length: 255 })
  manufacturingCompany?: string | null;

  @Property({ type: "date", nullable: true })
  vehicleManufacturingDate?: Date | null;

  @Property({ type: "date", nullable: true })
  registrationDate?: Date | null;

  @Property({ nullable: true, length: 255 })
  engineNumber?: string | null;

  @Property({ type: "date", nullable: true })
  lastFitnessDate?: Date | null;

  @Property({ nullable: true, length: 255 })
  vehicleModel?: string | null;

  @Property({ nullable: true, length: 255 })
  customerName?: string | null;

  @Property({ type: "text", nullable: true })
  customerAddress?: string | null;

  @Property({ nullable: true, length: 255 })
  dealerName?: string | null;

  @Property({ type: "text", nullable: true })
  dealerAddress?: string | null;

  @Property({ nullable: true, length: 255 })
  vtdModel?: string | null;

  @Property({ nullable: true, length: 255 })
  vtdUniqueId?: string | null;

  @Property({ nullable: true, length: 255 })
  invoiceNumber?: string | null;

  @Property({ type: "date", nullable: true })
  invoiceDate?: Date | null;

  @Property({ nullable: true, length: 255 })
  simIccidNumber?: string | null;

  @Property({ nullable: true, length: 255 })
  ideaNumber?: string | null;

  @Property({ nullable: true, length: 255 })
  bsnlNumber?: string | null;

  @ManyToOne(() => District, { nullable: true })
  rtoDistrict?: District | null;

  @ManyToOne(() => State, { nullable: true })
  rtoState?: State | null;

  @Property({ type: "date", nullable: true })
  dueDate?: Date | null;

  @Property({ nullable: true, length: 1000 })
  fitmentImage1?: string | null;

  @Property({ nullable: true, length: 1000 })
  fitmentImage2?: string | null;

  @Property({ nullable: true, length: 1000 })
  fitmentImage3?: string | null;

  @Property({ nullable: true, length: 1000 })
  fitmentImage4?: string | null;

  @Property({ nullable: true, length: 1000 })
  vendorLogo1?: string | null;

  @Property({ nullable: true, length: 1000 })
  vendorLogo2?: string | null;

  @Property({ nullable: true, length: 255 })
  name?: string | null;

  @Property({ nullable: true, length: 255 })
  surname?: string | null;

  @Property({ nullable: true, length: 255 })
  fatherName?: string | null;

  @Property({ nullable: true, length: 50 })
  panNumber?: string | null;

  @Property({ nullable: true, length: 50 })
  aadhaarNo?: string | null;

  @Property({ type: "text", nullable: true })
  remark?: string | null;

  @Property({ nullable: true, length: 1000 })
  pancardLogo?: string | null;

  @Property({ nullable: true, length: 1000 })
  aadhaarFront?: string | null;

  @Property({ nullable: true, length: 1000 })
  aadhaarBack?: string | null;

  @Enum({ items: () => Status, nullable: true })
  status?: Status | null;

  @Property({ nullable: true, length: 1000 })
  reason?: string | null;

  @ManyToOne(() => Client, { nullable: true })
  createdBy?: Client;

  @ManyToOne(() => Client, { nullable: true })
  updatedBy?: Client;

  @ManyToOne(() => Client, { nullable: true })
  deletedBy?: Client;

  @Property({ default: false })
  isDeleted: boolean = false;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property({ nullable: true })
  deletedAt?: Date;
}
