import {
  Entity,
  Enum,
  ManyToOne,
  PrimaryKey,
  Property,
  Index,
} from "@mikro-orm/core";
import { Exclude } from "class-transformer";
import { v4 as uuidv4 } from "uuid";
import { AlertAssignType } from "../../enums/AlertAssignType";
import { Status } from "../../enums/status";
import { AddGroup } from "./AddGroup";
import { AddVehicle } from "./AddVehicle";
import { AlertType } from "./AlertType";
import { Client } from "./Client";
import { Transporter } from "./Transporter";
import { User } from "./User";

@Entity({ tableName: "alerts" })
export class Alert {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @Property({ nullable: false, length: 255 })
  alertName!: string;

  @Enum(() => AlertAssignType)
  alertAssignedTo!: AlertAssignType;

  @ManyToOne(() => Transporter, { nullable: true })
  transporter?: Transporter | null;

  @ManyToOne(() => User, { nullable: true })
  user?: User | null;

  @ManyToOne(() => AddGroup, { nullable: true })
  group?: AddGroup | null;

  @ManyToOne(() => AddVehicle, { nullable: false })
  vehicle!: AddVehicle;

  @ManyToOne(() => AlertType, { nullable: false })
  alertType!: AlertType;

  @Property({ default: false })
  mobile: boolean = false;

  @Enum(() => Status)
  status: Status = Status.ACTIVE;

  @Property({ nullable: true, length: 1000 })
  reason?: string;

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
