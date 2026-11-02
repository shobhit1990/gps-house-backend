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
import { Status } from "../../enums/status";
import { TicketType } from "../../enums/TicketType";
import { AddVehicle } from "./AddVehicle";
import { Client } from "./Client";
import { Transporter } from "./Transporter";

@Entity({ tableName: "raise_tickets" })
export class RaiseTicket {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @ManyToOne(() => Client, { nullable: true })
  client?: Client | null;

  @ManyToOne(() => Transporter, { nullable: true })
  transporter?: Transporter | null;

  @ManyToOne(() => AddVehicle, { nullable: true })
  vehicle?: AddVehicle | null;

  @Enum(() => TicketType)
  ticketType!: TicketType;

  @Property({ type: "text" })
  description!: string;

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
