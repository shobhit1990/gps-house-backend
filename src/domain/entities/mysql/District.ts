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
import { Client } from "./Client";
import { State } from "./State";

@Entity({ tableName: "district" })
export class District {
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @Property({ length: 10 })
  @Index()
  districtCode!: string;

  @Property({ length: 100 })
  districtName!: string;

  @ManyToOne(() => State, { nullable: false })
  state!: State;

  @ManyToOne(() => Client, { nullable: true })
  createdBy?: Client;

  @ManyToOne(() => Client, { nullable: true })
  updatedBy?: Client;

  @ManyToOne(() => Client, { nullable: true })
  deletedBy?: Client;

  @Enum({ items: () => Status, nullable: true })
  status?: Status;

  @Property({ nullable: true, length: 1000 })
  reason?: string | null;

  @Property({ default: false })
  isDeleted: boolean = false;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property({ nullable: true })
  deletedAt?: Date;
}
