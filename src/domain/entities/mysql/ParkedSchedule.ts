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
import { Scheduled } from "../../enums/Scheduled";
import { Status } from "../../enums/status";
import { AddVehicle } from "./AddVehicle";
import { Client } from "./Client";
import { Transporter } from "./Transporter";

@Entity({ tableName: "parked_schedule" })
export class ParkedSchedule {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @ManyToOne(() => Client, { nullable: false })
  client!: Client;

  @ManyToOne(() => Transporter, { nullable: false })
  transporter!: Transporter;

  @ManyToOne(() => AddVehicle, { nullable: false })
  vehicle!: AddVehicle;

  @Enum(() => Scheduled)
  scheduled!: Scheduled;

  @Property({ type: "date", nullable: true })
  startDate?: string | null;

  @Property({ type: "date", nullable: true })
  endDate?: string | null;

  @Property({ type: "time" })
  scheduledFrom!: string;

  @Property({ type: "time" })
  scheduledTill!: string;

  @Enum({ items: () => Status, nullable: true })
  status?: Status | null;

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
