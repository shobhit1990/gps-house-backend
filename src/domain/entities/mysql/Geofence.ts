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
import { AssignType } from "../../enums/AssignType";
import { Status } from "../../enums/status";
import { TransitTime } from "../../enums/TransitTime";
import { Client } from "./Client";
import { GeofType } from "./GeofType";
import { GeofAssignType } from "../../enums/GeofAssignType";
import { Shapes } from "../../enums/Shapes";

@Entity({ tableName: "geofence" })
export class Geofence {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @Property({ nullable: false, length: 255 })
  name!: string;

  @ManyToOne(() => GeofType, {
    fieldName: "geof_type_id",
    nullable: false,
  })
  type!: GeofType;

  @Enum(() => GeofAssignType)
  assignType!: GeofAssignType;

  @Property({ nullable: true, length: 255 })
  geofenceCode?: string | null;

  @Enum({ items: () => TransitTime, nullable: true })
  transitTime?: TransitTime | null;

  @Enum({ items: () => Shapes, nullable: true })
  shapes?: Shapes;

  @Property({ type: "json", nullable: false })
  latitude!: number[];

  @Property({ type: "json", nullable: false })
  longitude!: number[];

  @Enum({ items: () => Status, nullable: true })
  status?: Status;

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
