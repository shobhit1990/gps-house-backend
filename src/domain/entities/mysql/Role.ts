import { Entity, Enum, ManyToOne, PrimaryKey, Property, Unique } from "@mikro-orm/core";
import { Exclude, Expose } from "class-transformer";
import { Client } from "./Client";
import { Status } from "../../enums/status";
import { v4 as uuidv4 } from "uuid";

@Entity({ tableName: "role" })
@Unique()
export class Role {
    @Exclude()
    @PrimaryKey({ autoincrement: true, type: "int", unsigned: true })
    id!: number;

    @Expose({ name: "id" })
    @Property({ unique: true })
    externalId: string = uuidv4();

    @Expose()
    @Property({ unique: true, nullable: false })
    roleCode!: string;

    @Expose()
    @Property({ nullable: false })
    name?: string;

    @Exclude()
    @ManyToOne(() => Client, { nullable: true })
    createdBy: Client | null = null;

    @Exclude()
    @ManyToOne(() => Client, { nullable: true })
    updatedBy?: Client;

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

    @Property({ nullable: true })
    reason?: string;

    @Exclude({toPlainOnly: true})
    @Enum(() => Status)
    status: Status = Status.ACTIVE;
}