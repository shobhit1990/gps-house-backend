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
import { Client } from "./Client";
import { ExpenseType } from "./ExpenseType";
import { Transporter } from "./Transporter";

@Entity({ tableName: "expense" })
export class Expense {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Expose({ name: "id" })
  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @ManyToOne(() => Client, { fieldName: "client", nullable: false })
  client!: Client;

  @ManyToOne(() => Transporter, { fieldName: "transporter", nullable: false })
  transporter!: Transporter;

  @Property({ nullable: true, length: 255 })
  expenseName?: string;

  @ManyToOne(() => ExpenseType, { fieldName: "expense_type", nullable: false })
  expenseType!: ExpenseType;

  @Property({ type: "decimal", precision: 12, scale: 2 })
  amount!: number;

  @Property({ type: "datetime" })
  expenseDate!: Date;

  @Property({ type: "double", nullable: true })
  odometer?: number;

  @Property({ type: "double", nullable: true })
  engineHours?: number;

  @Property({ type: "text", nullable: true })
  description?: string;

  @Property({ type: "double", nullable: true })
  quantity?: number;

  @Property({ nullable: true, length: 255 })
  supplier?: string;

  @Property({ nullable: true, length: 255 })
  buyer?: string;

  @ManyToOne(() => Client, { nullable: true })
  createdBy?: Client;

  @ManyToOne(() => Client, { nullable: true })
  updatedBy?: Client;

  @ManyToOne(() => Client, { nullable: true })
  deletedBy?: Client;

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
