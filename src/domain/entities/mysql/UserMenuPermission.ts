import {
  Entity,
  Enum,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from "@mikro-orm/core";
import { Exclude, Expose } from "class-transformer";
import { v4 as uuidv4 } from "uuid";
import { Status } from "../../enums/status";
import { Client } from "./Client";
import { MenuItem } from "./MenuItem";
import { User } from "./User";

@Entity({ tableName: "user_menu_permissions" })
@Unique({ properties: ["user", "menuItem"] })
export class UserMenuPermission {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: true })
  id!: number;

  @Expose({ name: "id" })
  @Property({ unique: true })
  externalId: string = uuidv4();

  @ManyToOne(() => User, { nullable: false })
  user!: User;

  @ManyToOne(() => MenuItem, { nullable: false })
  menuItem!: MenuItem;

  @Property({ default: false })
  view: boolean = false;

  @Property({ default: false })
  add: boolean = false;

  @Property({ default: false })
  edit: boolean = false;

  @Property({ default: false })
  delete: boolean = false;

  @Property({ default: false })
  filter: boolean = false;

  @Property({ default: false })
  print: boolean = false;

  @Property({ default: false })
  excel: boolean = false;

  @ManyToOne(() => Client, { nullable: true })
  createdBy?: Client;

  @ManyToOne(() => Client, { nullable: true })
  updatedBy?: Client;

  @Enum(() => Status)
  status: Status = Status.ACTIVE;

  @Exclude()
  @Property({ default: false })
  isDeleted: boolean = false;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  deletedBy?: Client;

  @Exclude()
  @Property({ nullable: true })
  deletedAt?: Date;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
