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
import { AddGroup } from "./AddGroup";
import { Client } from "./Client";
import { Status } from "../../enums/status";
import { TimeZone } from "./TimeZone";

@Entity({ tableName: "users" })
export class User {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Expose({ name: "id" })
  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @Property({ unique: true, nullable: false, length: 100 })
  userName!: string;

  @Exclude()
  @Property({ nullable: false })
  password!: string;

  @ManyToOne(() => AddGroup, { nullable: false })
  group!: AddGroup;

  @ManyToOne(() => TimeZone, { nullable: false })
  timezone!: TimeZone;

  @Property({ nullable: false, length: 255 })
  companyName!: string;

  @Property({ nullable: true, length: 255 })
  contactPersonName?: string;

  @Property({ nullable: true, unique: true, length: 255 })
  email?: string;

  @Property({ nullable: true, unique: true, length: 20 })
  phone?: string;

  @Property({ nullable: true, length: 1000 })
  companyAddress?: string;

  @Property({ nullable: true, type: "int", unsigned: true })
  dataRestrictionDays?: number;

  @Property({ nullable: false, default: false })
  isSchoolUser: boolean = false;

  @Enum(() => Status)
  status: Status = Status.ACTIVE;

  @Property({ nullable: true, length: 1000 })
  reason?: string;

  @Exclude()
  @Property({ default: false })
  isDeleted: boolean = false;

  @ManyToOne(() => Client, { nullable: true })
  createdBy?: Client;

  @ManyToOne(() => Client, { nullable: true })
  updatedBy?: Client;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  deletedBy?: Client;

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
