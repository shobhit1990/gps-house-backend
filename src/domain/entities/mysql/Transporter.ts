import { Entity, Enum, Index, ManyToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { Exclude, Expose, Transform } from "class-transformer";
import { v4 as uuidv4 } from "uuid";
import { Client } from "./Client";
import { Language } from "./Language";
import { TimeZone } from "./TimeZone";
import { InactiveTime } from "../../enums/InactiveTime";
import { Status } from "../../enums/status";

@Entity({ tableName: "add_transporter" })
export class Transporter {
    @Exclude()
    @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
    id!: number;

    @Expose({ name: "id" })
    @Property({ unique: true })
    @Index()
    externalId: string = uuidv4();

    @Property({ nullable: false, unique: true })
    userName!: string;

    @Exclude()
    @Property({ nullable: false })
    password!: string;

    @Property({ nullable: false })
    companyName!: string;

    @Expose()
    @ManyToOne(() => Client, {
        fieldName: "client",
        nullable: false,
    })
    client!: Client;

    @Expose()
    @ManyToOne(() => Language, {
        fieldName: "language",
        nullable: false,
    })
    language!: Language;

    @Expose()
    @ManyToOne(() => TimeZone, {
        fieldName: "timezone",
        nullable: false,
    })
    timezone!: TimeZone;

    @Enum(() => InactiveTime)
    inactiveTime: InactiveTime = InactiveTime.ONE;

    @Property({ nullable: true, unique: true })
    email?: string;

    @Property({ nullable: false })
    name?: string;

    @Property({ nullable: true, unique: true, type: "bigint" })
    @Transform(({ value }) => value ? value.toString() : value, { toPlainOnly: true })
    phone?: number;

    @Property({ nullable: true })
    address?: string;

    @Property({ type: "date", nullable: true })
    subscriptionStartDate?: Date;

    @Property({ type: "date", nullable: true })
    subscriptionDueDate?: Date;

    @Property({  type: "date", nullable: false })
    subscriptionExtendDate?: Date;

    @Property({ nullable: true })
    subscriptionExpiryCount?: String;

    @Property({ nullable: true })
    maximumRadiusForNearestPOI ?: String;

    @Property({ nullable: true })
    minimumDistanceForAddress ?: String;

    @Property({ nullable: true })
    dataRestriction ?: String;

    @Exclude()
    @ManyToOne(() => Client, { nullable: true })
    createdBy!: Client;

    @Exclude()
    @ManyToOne(() => Client, { nullable: true })
    updatedBy?: Client;

    @Enum(() => Status)
    status: Status = Status.ACTIVE;

    @Property({ nullable: true })
    reason?: string;

    @Exclude()
    @Property({ default: false })
    isDeleted: boolean = false;

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

    @Exclude()
    @Property({ nullable: false, default: 0 })
    sessionVersion: number = 0;

}