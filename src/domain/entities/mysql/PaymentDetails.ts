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
import { PaymentTerm } from "../../enums/PaymentTerm";
import { Status } from "../../enums/status";
import { Type } from "../../enums/Type";
import { Transporter } from "./Transporter";
import { Client } from "./Client";

@Entity({ tableName: "payment_details" })
export class PaymentDetails {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Expose({ name: "id" })
  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @Enum({ items: () => Type, nullable: true })
  type?: Type;

  @Expose()
  @ManyToOne(() => Transporter, { fieldName: "transporter", nullable: false })
  transporter!: Transporter;

  @Property({ type: "double", nullable: true })
  sellingPrice?: number;

  @Enum(() => PaymentTerm)
  paymentTerm!: PaymentTerm;

  @Property({ type: "date", nullable: true })
  installationDate?: Date;

  @Property({ type: "date", nullable: true })
  rentalDueDate?: Date;

  @Property({ nullable: true })
  technicianName?: string;

  @Property({ type: "double", nullable: true })
  rental?: number;

  @Property({ nullable: true, length: 50 })
  remark?: string;

  @Enum({ items: () => Status, nullable: true })
  status?: Status;

  @Property({ nullable: true })
  reason?: string;

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
  @ManyToOne(() => Client, { nullable: true })
  createdBy?: Client;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  updatedBy?: Client;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  deletedBy?: Client;
}
