import {
    Index,
    Entity,
    Enum,
    ManyToOne,
    PrimaryKey,
    Property
} from "@mikro-orm/core";
import { v4 as uuidv4 } from "uuid";
import { Exclude, Expose } from "class-transformer";
import { Status } from "../../enums/status";
import { Client } from "./Client";

@Entity({ tableName: "owner_master" })
export class Owner {
    @Exclude()
    @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
    id!: number;

    @Expose({ name: "id" })
    @Property({ unique: true })
    @Index()
    externalId: string = uuidv4();

    @Property({ nullable: false })
    ownerName?: string;

    @Exclude()
    @ManyToOne(() => Client, { nullable: true })
    createdBy!: Client;

    @Exclude()
    @ManyToOne(() => Client, { nullable: true })
    updatedBy?: Client;

    @Property({ nullable: true })
    reason?: string;

    @Enum(() => Status)
    status: Status = Status.ACTIVE;

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
}