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
import { Client } from "./Client";
import { Transporter } from "./Transporter";
import { FuelType } from "../../enums/FuelType";
import { Hours } from "../../enums/Hours";
import { Minutes } from "../../enums/Minutes";
import { OwnerdBy } from "../../enums/OwnedBy";
import { VehicleBodyType } from "../../enums/VehicleBodyType";
import { VehicleType } from "../../enums/VehicleType";
import { Status } from "../../enums/status";

@Entity({ tableName: "add_vehicle" })
export class AddVehicle {
    @Exclude()
    @PrimaryKey({ autoincrement: true, type: "int", unsigned: false })
    id!: number;

    @Expose({ name: "id" })
    @Property({ unique: true })
    @Index()
    externalId: string = uuidv4();

    @Property({ nullable: false })
    vehicle!: string;

    @Property({ type: "double", nullable: false })
    mileage!: number;

    @Enum(() => VehicleType)
    vehicleType!: VehicleType;

    @Property({ type: "double", nullable: false })
    overspeed!: number;

    @Enum({ items: () => Hours, nullable: true })
    hours?: Hours;

    @Enum({ items: () => Minutes, nullable: true })
    minutes?: Minutes;

    @Expose()
    @ManyToOne(() => Client, { fieldName: "client", nullable: false })
    client!: Client;

    @Property({ nullable: false })
    device!: string;

    @Expose()
    @ManyToOne(() => Transporter, { fieldName: "transporter", nullable: false })
    transporter!: Transporter;

    @Property({ type: "date", nullable: false })
    subscriptionStartDate!: Date;

    @Property({ type: "date", nullable: false })
    subscriptionDueDate!: Date;

    @Enum({ items: () => FuelType, nullable: true })
    fuelType?: FuelType;

    @Property({ type: "double", nullable: true })
    currentOdometerReading?: number;

    @Property({ nullable: true })
    vehicleNickname?: string;

    @Property({ nullable: true })
    remark?: string;

    @Property({ type: "double", nullable: true })
    durationOdometer?: number;

    @Property({ nullable: true })
    remark2?: string;

    @Property({ nullable: false, default: false })
    parkingViolationAlarmOnIgnitionOn: boolean = false;

    @Property({ nullable: true })
    ownerName?: string;

    @Enum({ items: () => OwnerdBy, nullable: true })
    ownedBy?: OwnerdBy;

    @Property({ nullable: true })
    vehicleBrand?: string;

    @Property({ nullable: true })
    vehicleModel?: string;

    @Enum({ items: () => VehicleBodyType, nullable: true })
    vehicleBody?: VehicleBodyType;

    @Property({ type: "double", nullable: true })
    capacity?: number;

    @Property({ type: "date", nullable: true })
    manufactureDate?: Date;

    @Property({ type: "date", nullable: true })
    purchaseDate?: Date;

    @Enum({ items: () => Status, nullable: true })
    status?: Status;

    @Property({ nullable: true })
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
}
