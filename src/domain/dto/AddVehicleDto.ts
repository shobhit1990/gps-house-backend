import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Matches,
    Min,
} from "class-validator";
import { FuelType } from "../enums/FuelType";
import { Hours } from "../enums/Hours";
import { Minutes } from "../enums/Minutes";
import { OwnerdBy } from "../enums/OwnedBy";
import { VehicleBodyType } from "../enums/VehicleBodyType";
import { VehicleType } from "../enums/VehicleType";
import { Status } from "../enums/status";

const enumMessage = (name: string, values: object) =>
    `${name} must be one of: ${Object.values(values).join(", ")}`;

export class CreateAddVehicleDto {
    @IsString()
    @Matches(/^[A-Za-z0-9_-]+$/, {
        message: "vehicle may contain only letters, numbers, hyphens, and underscores",
    })
    vehicle!: string;

    @IsNumber()
    @Min(0)
    mileage!: number;

    @IsEnum(VehicleType, { message: enumMessage("vehicleType", VehicleType) })
    vehicleType!: VehicleType;

    @IsNumber()
    @Min(0)
    overspeed!: number;

    @IsOptional()
    @IsEnum(Hours, { message: enumMessage("hours", Hours) })
    hours?: Hours;

    @IsOptional()
    @IsEnum(Minutes, { message: enumMessage("minutes", Minutes) })
    minutes?: Minutes;

    @IsString()
    @IsNotEmpty()
    client!: string;

    @IsString()
    @IsNotEmpty()
    device!: string;

    @IsString()
    @IsNotEmpty()
    transporter!: string;

    @IsDateString()
    subscriptionStartDate!: string;

    @IsDateString()
    subscriptionDueDate!: string;

    @IsOptional()
    @IsEnum(FuelType, { message: enumMessage("fuelType", FuelType) })
    fuelType?: FuelType;

    @IsOptional()
    @IsNumber()
    @Min(0)
    currentOdometerReading?: number;

    @IsOptional()
    @IsString()
    vehicleNickname?: string;

    @IsOptional()
    @IsString()
    remark?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    durationOdometer?: number;

    @IsOptional()
    @IsString()
    remark2?: string;

    @IsOptional()
    @IsBoolean()
    parkingViolationAlarmOnIgnitionOn?: boolean;

    @IsOptional()
    @IsString()
    ownerName?: string;

    @IsOptional()
    @IsEnum(OwnerdBy, { message: enumMessage("ownedBy", OwnerdBy) })
    ownedBy?: OwnerdBy;

    @IsOptional()
    @IsString()
    vehicleBrand?: string;

    @IsOptional()
    @IsString()
    vehicleModel?: string;

    @IsOptional()
    @IsEnum(VehicleBodyType, {
        message: enumMessage("vehicleBody", VehicleBodyType),
    })
    vehicleBody?: VehicleBodyType;

    @IsOptional()
    @IsNumber()
    @Min(0)
    capacity?: number;

    @IsOptional()
    @IsDateString()
    manufactureDate?: string;

    @IsOptional()
    @IsDateString()
    purchaseDate?: string;

    @IsOptional()
    @IsEnum(Status, { message: enumMessage("status", Status) })
    status?: Status;

    @IsOptional()
    @IsString()
    reason?: string;
}

export class UpdateAddVehicleDto {
    @IsOptional()
    @IsString()
    @Matches(/^[A-Za-z0-9_-]+$/, {
        message: "vehicle may contain only letters, numbers, hyphens, and underscores",
    })
    vehicle?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    mileage?: number;

    @IsOptional()
    @IsEnum(VehicleType, { message: enumMessage("vehicleType", VehicleType) })
    vehicleType?: VehicleType;

    @IsOptional()
    @IsNumber()
    @Min(0)
    overspeed?: number;

    @IsOptional()
    @IsEnum(Hours, { message: enumMessage("hours", Hours) })
    hours?: Hours;

    @IsOptional()
    @IsEnum(Minutes, { message: enumMessage("minutes", Minutes) })
    minutes?: Minutes;

    @IsOptional()
    @IsString()
    client?: string;

    @IsOptional()
    @IsString()
    device?: string;

    @IsOptional()
    @IsString()
    transporter?: string;

    @IsOptional()
    @IsDateString()
    subscriptionStartDate?: string;

    @IsOptional()
    @IsDateString()
    subscriptionDueDate?: string;

    @IsOptional()
    @IsEnum(FuelType, { message: enumMessage("fuelType", FuelType) })
    fuelType?: FuelType;

    @IsOptional()
    @IsNumber()
    @Min(0)
    currentOdometerReading?: number;

    @IsOptional()
    @IsString()
    vehicleNickname?: string;

    @IsOptional()
    @IsString()
    remark?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    durationOdometer?: number;

    @IsOptional()
    @IsString()
    remark2?: string;

    @IsOptional()
    @IsBoolean()
    parkingViolationAlarmOnIgnitionOn?: boolean;

    @IsOptional()
    @IsString()
    ownerName?: string;

    @IsOptional()
    @IsEnum(OwnerdBy, { message: enumMessage("ownedBy", OwnerdBy) })
    ownedBy?: OwnerdBy;

    @IsOptional()
    @IsString()
    vehicleBrand?: string;

    @IsOptional()
    @IsString()
    vehicleModel?: string;

    @IsOptional()
    @IsEnum(VehicleBodyType, {
        message: enumMessage("vehicleBody", VehicleBodyType),
    })
    vehicleBody?: VehicleBodyType;

    @IsOptional()
    @IsNumber()
    @Min(0)
    capacity?: number;

    @IsOptional()
    @IsDateString()
    manufactureDate?: string;

    @IsOptional()
    @IsDateString()
    purchaseDate?: string;

    @IsOptional()
    @IsEnum(Status, { message: enumMessage("status", Status) })
    status?: Status;

    @IsOptional()
    @IsString()
    reason?: string;
}