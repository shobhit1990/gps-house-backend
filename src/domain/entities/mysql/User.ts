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
import { AddGroup } from "./AddGroup";
import { Client } from "./Client";
import { Language } from "./Language";
import { Owner } from "./Owner";
import { Status } from "../../enums/status";
import { TimeZone } from "./TimeZone";
import { InactiveTime } from "../../enums/InactiveTime";
import { UserType } from "../../enums/UserType";

@Entity({ tableName: "users" })
export class User {
  @Exclude()
  @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
  id!: number;

  @Expose({ name: "id" })
  @Property({ unique: true })
  @Index()
  externalId: string = uuidv4();

  @Property({ unique: true, nullable: false, length: 255 })
  userName!: string;

  @Exclude()
  @Property({ nullable: false })
  password!: string;

  @ManyToOne(() => AddGroup, { nullable: true })
  group?: AddGroup;

  @ManyToOne(() => TimeZone, { nullable: true })
  timezone?: TimeZone;

  @ManyToOne(() => Owner, { nullable: true })
  owner?: Owner;

  @ManyToOne(() => Language, { nullable: true })
  language?: Language;

  @ManyToOne(() => User, { nullable: true })
  client?: User;

  @Property({ nullable: false, length: 255 })
  companyName!: string;

  @Property({ nullable: true, length: 255 })
  name?: string;

  @Property({ nullable: true, length: 255 })
  contactPersonName?: string;

  @Property({ nullable: true, unique: true, length: 255 })
  email?: string;

  @Property({ nullable: true, unique: true, length: 20 })
  phone?: string;

  @Property({ nullable: true, length: 1000 })
  companyAddress?: string;

  @Property({ nullable: true, length: 255 })
  address?: string;

  @Property({ nullable: true, length: 255 })
  domain?: string;

  @Property({ fieldName: "vehicle_count", nullable: true, length: 255 })
  vehicleCount?: string;

  @Property({ nullable: true, type: "int", unsigned: true })
  maxVehicleCount?: number;

  @Property({ nullable: true })
  allowAllVehicleList?: boolean;

  @Property({ type: "json", nullable: true })
  clientImage?: string;

  @Property({ type: "tinyint", nullable: true })
  inactiveTime?: InactiveTime;

  @Property({ type: "date", nullable: true })
  subscriptionStartDate?: Date;

  @Property({ type: "date", nullable: true })
  subscriptionDueDate?: Date;

  @Property({ type: "date", nullable: true })
  subscriptionExtendDate?: Date;

  @Property({ nullable: true })
  subscriptionExpiryCount?: string;

  @Property({ nullable: true })
  maximumRadiusForNearestPOI?: string;

  @Property({ nullable: true })
  minimumDistanceForAddress?: string;

  @Property({ nullable: true })
  dataRestriction?: string;

  @Property({ nullable: true })
  overwriteSubscription?: boolean;

  @Property({ nullable: true })
  vehicleInactiveAfterExpiry?: boolean;

  @Property({ nullable: false, default: 0 })
  sessionVersion: number = 0;

  @Exclude()
  @Property({ nullable: true, length: 60 })
  otpHash?: string | null;

  @Exclude()
  @Property({ nullable: true, type: "datetime" })
  otpExpiresAt?: Date | null;

  @Exclude()
  @Property({ nullable: true, type: "datetime" })
  otpSentAt?: Date | null;

  @Exclude()
  @Property({ nullable: false, default: 0 })
  otpAttempts: number = 0;

  @Exclude()
  @Property({ nullable: true, length: 64 })
  refreshTokenHash?: string | null;

  @Exclude()
  @Property({ nullable: true, type: "datetime" })
  refreshTokenExpiresAt?: Date | null;

  get owner_name(): Owner | undefined {
    return this.owner;
  }

  set owner_name(value: Owner | undefined) {
    this.owner = value;
  }

  get vehicle_count(): string | undefined {
    return this.vehicleCount;
  }

  set vehicle_count(value: string | undefined) {
    this.vehicleCount = value;
  }

  get maxRadiusNearestPoi(): string | undefined {
    return this.maximumRadiusForNearestPOI;
  }

  set maxRadiusNearestPoi(value: string | undefined) {
    this.maximumRadiusForNearestPOI = value;
  }

  get minDistanceForAddress(): string | undefined {
    return this.minimumDistanceForAddress;
  }

  set minDistanceForAddress(value: string | undefined) {
    this.minimumDistanceForAddress = value;
  }

  @Enum({ items: () => UserType, default: UserType.USER })
  userType: UserType = UserType.USER;

  @Property({ nullable: true, length: 255 })
  imeiNumber?: string;

  @Property({ nullable: true, type: "int", unsigned: true })
  dataRestrictionDays?: number;

  @Property({ nullable: false, default: false })
  isSchoolUser: boolean = false;

  @Enum(() => Status)
  status: Status = Status.ACTIVE;

  @Property({ nullable: true, length: 1000 })
  reason?: string;

  @Exclude()
  @Property({ default: false })
  isDeleted: boolean = false;

  @ManyToOne(() => Client, { nullable: true })
  createdBy?: Client;

  @ManyToOne(() => Client, { nullable: true })
  updatedBy?: Client;

  @Exclude()
  @ManyToOne(() => Client, { nullable: true })
  deletedBy?: Client;

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
