import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
} from "@mikro-orm/core";
import { Exclude } from "class-transformer";
import { v4 as uuidv4 } from "uuid";
import { AddAlertType } from "../../enums/AddAlertType";
import { Status } from "../../enums/status";
import { Client } from "./Client";

@Entity({ tableName: "add_alerts" })
export class AddAlert {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @Property({ type: "json" })
  alertTypes!: AddAlertType[];

  @Property({ type: "double", nullable: true })
  overDriveDailyDistance?: number | null;

  @Property({ type: "double", nullable: true })
  overDriveWeeklyDistance?: number | null;

  @Property({ type: "double", nullable: true })
  underDriveDailyDistance?: number | null;

  @Property({ type: "double", nullable: true })
  underDriveWeeklyDistance?: number | null;

  @Property({ default: false })
  mobile: boolean = false;

  @Enum(() => Status)
  status: Status = Status.ACTIVE;

  @Property({ nullable: true, length: 1000 })
  reason?: string | null;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  createdBy?: Client;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  updatedBy?: Client;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  deletedBy?: Client;

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
  @Property({ nullable: true })
  deletedAt?: Date;
}
