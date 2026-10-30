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
import { AnnounceMent } from "../../enums/AnnounceMent";
import { messageType } from "../../enums/MessageType";
import { Status } from "../../enums/status";
import { Validity } from "../../enums/Validity";
import { Client } from "./Client";
import { Transporter } from "./Transporter";

@Entity({ tableName: "announcements" })
export class Announcement {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @Enum(() => AnnounceMent)
  announcement!: AnnounceMent;

  @ManyToOne(() => Client, { nullable: false })
  client!: Client;

  @ManyToOne(() => Transporter, { nullable: true })
  transporter?: Transporter | null;

  @Enum(() => Validity)
  validityTime!: Validity;

  @Property({ type: "int" })
  validityDuration!: number;

  @Enum(() => messageType)
  messageType!: messageType;

  @Property({ length: 255 })
  title!: string;

  @Property({ type: "text", nullable: true })
  body?: string | null;

  @Property({ nullable: true, length: 1000 })
  messageImage?: string | null;

  @Property({ default: false })
  requestForDontShowAgainOption: boolean = false;

  @Property({ default: false })
  requestForProfileUpdate: boolean = false;

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
