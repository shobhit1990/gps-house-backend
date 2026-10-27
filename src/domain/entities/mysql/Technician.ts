import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
} from "@mikro-orm/core";
import { Exclude, Expose, Transform } from "class-transformer";
import { v4 as uuidv4 } from "uuid";
import { Status } from "../../enums/status";
import { Client } from "./Client";
import { TimeZone } from "./TimeZone";

@Entity({ tableName: "add_technician" })
export class Technician {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Expose({ name: "id" })
  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @Property({ nullable: false, unique: true })
  userName!: string;

  @Exclude()
  @Property({ nullable: false })
  password!: string;

  @Property({ nullable: false })
  companyName!: string;

  @Property({ nullable: true })
  name?: string;

  @Property({ nullable: true, unique: true })
  email?: string;

  @Property({ nullable: true, unique: true, type: "bigint" })
  @Transform(({ value }) => (value ? value.toString() : value), {
    toPlainOnly: true,
  })
  phone?: number;

  @Property({ nullable: true })
  address?: string;

  @Expose()
  @ManyToOne(() => TimeZone, { fieldName: "timezone", nullable: false })
  timezone!: TimeZone;

  @Expose()
  @ManyToOne(() => Client, { fieldName: "client", nullable: false })
  client!: Client;

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
