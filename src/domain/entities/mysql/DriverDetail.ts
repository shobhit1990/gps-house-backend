import {
  Collection,
  Entity,
  Enum,
  Index,
  ManyToMany,
  ManyToOne,
  PrimaryKey,
  Property,
} from "@mikro-orm/core";
import { Exclude } from "class-transformer";
import { v4 as uuidv4 } from "uuid";
import { Status } from "../../enums/status";
import { Client } from "./Client";
import { Geofence } from "./Geofence";
import { License } from "./License";
import { Transporter } from "./Transporter";

@Entity({ tableName: "driver_detail" })
export class DriverDetail {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @ManyToOne(() => Client, { nullable: false })
  client!: Client;

  @ManyToOne(() => Transporter, { nullable: true })
  transporter?: Transporter;

  @Property({ nullable: false })
  firstName!: string;

  @Property({ nullable: false})
  lastName!: string;

  @Property({ nullable: true })
  deviceId?: string | null;

  @Property({ type: "date", nullable: true })
  dateOfJoining?: Date | null;

  @Property({ type: "date", nullable: true })
  dateOfLeaving?: Date | null;

  @Property({ type: "date", nullable: true })
  dateOfBirth?: Date | null;

  @Property({ type: "double", nullable: true })
  experience?: number | null;

  @Property({ type: "double", nullable: true })
  salary?: number | null;

  @Property({ nullable: true })
  phoneNumber?: string | null;

  @Property({ nullable: true, })
  licenseNumber?: string | null;

  @ManyToMany(() => License)
  licenseToDrive = new Collection<License>(this);

  @Property({ type: "date", nullable: true })
  licenseIssueDate?: Date | null;

  @Property({ type: "date", nullable: true })
  licenseExpiryDate?: Date | null;

  @Property({ nullable: true })
  lifeInsuranceNumber?: string | null;

  @Property({ type: "date", nullable: true })
  lifeInsuranceExpiryDate?: Date | null;

  @Property({ nullable: true })
  mediclaimNumber?: string | null;

  @Property({ type: "date", nullable: true })
  mediclaimExpiryDate?: Date | null;

  @Property({ nullable: true,})
  bloodGroup?: string | null;

  @Property({ nullable: true })
  supervisorName?: string | null;

  @Property({ nullable: true })
  supervisorPhoneNumber?: string | null;

  @Property({ nullable: true })
  address?: string | null;

  /** Document name + uploaded image path rows from the Upload Documents tab. */
  @Property({ type: "json", nullable: true })
  documents: Array<{ documentName: string; uploadDocument: string }> = [];

  @Property({ nullable: false, default: true })
  licenseAvailable: boolean = true;

  @Property({ nullable: false, default: true })
  licenseVerified: boolean = true;

  @Property({ nullable: false, default: true })
  enableGeoVerifiedAttendance: boolean = true;

  @ManyToMany(() => Geofence)
  geofences = new Collection<Geofence>(this);

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  createdBy?: Client;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  updatedBy?: Client;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  deletedBy?: Client;

  @Enum({ items: () => Status, nullable: true })
  status?: Status | null;

  @Property({ nullable: true})
  reason?: string | null;

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
