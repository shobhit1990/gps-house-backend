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
import { PaymentMode } from "../../enums/PymentMode";
import { Status } from "../../enums/status";
import { Client } from "./Client";
import { Transporter } from "./Transporter";

@Entity({ tableName: "billing_details" })
export class BillingDetail {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Expose({ name: "id" })
  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @Expose()
  @ManyToOne(() => Transporter, { fieldName: "transporter", nullable: false })
  transporter!: Transporter;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  createdBy?: Client;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  updatedBy?: Client;

  @Property({ nullable: true, length: 255 })
  billingName?: string;

  @Property({ nullable: true, length: 30 })
  gstNumber?: string;

  @Property({ nullable: true, length: 255 })
  billingEmail?: string;

  @Property({ nullable: true, length: 30 })
  billingPhone?: string;

  @Property({ nullable: true, type: "text" })
  billingAddress?: string;

  @Enum({ items: () => PaymentMode, nullable: true })
  paymentMode?: PaymentMode;

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
