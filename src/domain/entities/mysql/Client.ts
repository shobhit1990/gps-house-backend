import {
    Index,
    Entity,
    Enum,
    ManyToOne,
    PrimaryKey,
    Property
} from "@mikro-orm/core";
import { v4 as uuidv4 } from "uuid";
import { Exclude, Expose, Transform } from "class-transformer";
import { Status } from "../../enums/status";
import { IsOptional } from "class-validator";
import { Owner } from "./Owner";
import { Language } from "./Language";
import { TimeZone } from "./TimeZone";


@Entity({ tableName: "client" })
export class Client {
    @Exclude()
    @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
    id!: number;

    @Expose({ name: "id" })
    @Property({ unique: true })
    @Index()
    externalId: string = uuidv4();

    @Expose()
    @ManyToOne(() => Owner, {
        fieldName: "owner_name",
        nullable: false,
    })
    owner_name!: Owner;

    @Property({ nullable: false,unique: true })
    userName!: string;

    @Exclude()
    @Property({ nullable: false })
    password!: string;

    @Property({ nullable: false})
    companyName!: string;

    @Property({ nullable: true, unique: true})
    email?: string;

    @Property({ nullable: false })
    name?: string;

    @Property({ nullable: true, unique: true, type: "bigint" })
    @Transform(({ value }) => value ? value.toString() : value, { toPlainOnly: true })
    phone?: number;

    @Property({ nullable: true })
    address?: string;

    @Expose()
    @ManyToOne(() => Language, {
        fieldName: "language",
        nullable: false,
    })
    language!: Language;

    @Exclude()
    @Property({ nullable: true })
    domain?: string;

    @Exclude()
    @Property({ nullable: true })
    vehicle_count?: string;

    @Expose()
    @ManyToOne(() => TimeZone, {
        fieldName: "timezone",
        nullable: false,
    })
    timezone!: TimeZone;

    @Property({ type: "json", nullable: true })
    clientImage?: string;

    @Property({ nullable: true })
    @IsOptional()
    imeiNumber?: string | null;

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
