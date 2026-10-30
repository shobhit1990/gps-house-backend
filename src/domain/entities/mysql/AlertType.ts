import { Entity, Enum, Index, PrimaryKey, Property } from "@mikro-orm/core";
import { Exclude, Expose } from "class-transformer";
import { v4 as uuidv4 } from "uuid";
import { Status } from "../../enums/status";

@Entity()
export class AlertType {
    @Exclude()
    @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
    id!: number;

    @Expose({ name: "id" })
    @Property({ unique: true })
    @Index()
    externalId: string = uuidv4();

    @Property({ nullable: false, length: 100 })
    @Index()
    alertName!: string;

    @Property({ nullable: true })
    reason?: string;

    @Enum(() => Status)
    status: Status = Status.ACTIVE;

    @Exclude()
    @Property({ default: false })
    isDeleted: boolean = false;

    @Exclude()
    @Property({ onCreate: () => new Date() })
    createdAt: Date = new Date();

    @Exclude()
    @Property({ onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}