import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  ManyToOne,
  OneToMany,
  Collection,
} from "@mikro-orm/core";
import { Exclude, Expose } from "class-transformer";
// import { User } from "./User";
import { MenuType } from "../../enums/MenuType";
import { v4 as uuidv4 } from "uuid";
import { Status } from "../../enums/status";
import { Client } from "./Client";

@Entity({ tableName: "menu_items" })
export class MenuItem {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: true })
  id!: number;

  @Property()
  priority!: number;

  @Expose({ name: "id" })
  @Property({ unique: true })
  externalId: string = uuidv4();

  @Property({ unique: true })
  key!: string;

  @Property()
  label!: string;

  @Property({ default: false })
  isTitle: boolean = false;

  @Property({ default: true })
  showInMenu: boolean = true;

  @Property({ nullable: true })
  icon?: string;

  @Property({ nullable: true })
  url?: string;

  @Enum(() => MenuType)
  menuType: MenuType = MenuType.Web;

  @ManyToOne(() => MenuItem, { nullable: true })
  parent?: MenuItem;

  @OneToMany(() => MenuItem, (item) => item.parent)
  children = new Collection<MenuItem>(this);

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
