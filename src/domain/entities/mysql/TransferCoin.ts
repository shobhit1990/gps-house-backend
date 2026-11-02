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
import { AssignTo } from "../../enums/AssignTo";
import { Status } from "../../enums/status";
import { Client } from "./Client";
import { Transporter } from "./Transporter";

@Entity({ tableName: "transfer_coins" })
export class TransferCoin {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Expose({ name: "id" })
  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @Enum(() => AssignTo)
  assignTo!: AssignTo;

  @Expose()
  @ManyToOne(() => Client, { nullable: true })
  client?: Client | null;

  @Expose()
  @ManyToOne(() => Transporter, { nullable: true })
  transporter?: Transporter | null;

  @Property({ type: "int", unsigned: true })
  coins!: number;

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
