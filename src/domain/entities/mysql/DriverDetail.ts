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
  deviceId?: string;

  @Property({ type: "date", nullable: true })
  dateOfJoining?: Date;

  @Property({ type: "date", nullable: true })
  dateOfLeaving?: Date;

  @Property({ type: "date", nullable: true })
  dateOfBirth?: Date;

  @Property({ type: "double", nullable: true })
  experience?: number;

  @Property({ type: "double", nullable: true })
  salary?: number;

  @Property({ nullable: true })
  phoneNumber?: string;

  @Property({ nullable: true, })
  licenseNumber?: string;

  @ManyToMany(() => License)
  licenseToDrive = new Collection<License>(this);

  @Property({ type: "date", nullable: true })
  licenseIssueDate?: Date;

  @Property({ type: "date", nullable: true })
  licenseExpiryDate?: Date;

  @Property({ nullable: true })
  lifeInsuranceNumber?: string;

  @Property({ type: "date", nullable: true })
  lifeInsuranceExpiryDate?: Date;

  @Property({ nullable: true })
  mediclaimNumber?: string;

  @Property({ type: "date", nullable: true })
  mediclaimExpiryDate?: Date;

  @Property({ nullable: true,})
  bloodGroup?: string;

  @Property({ nullable: true })
  supervisorName?: string;

  @Property({ nullable: true })
  supervisorPhoneNumber?: string;

  @Property({ nullable: true })
  address?: string;

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
  status?: Status;

  @Property({ nullable: true})
  reason?: string;

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
