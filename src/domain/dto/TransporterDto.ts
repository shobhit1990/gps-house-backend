import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Status } from "../enums/status";
import { IsMobileNumber, IsPassword } from "../validators/UserValidators";
import { Expose } from "class-transformer";
import { ToLowerCase } from "../../utils/textNormalization";
import { InactiveTime } from "../enums/InactiveTime";

const STATUS_ENUM_MESSAGE = `Status must be one of: ${Object.values(Status).join(", ")}`;
const INACTIVETIME_ENUM_MESSAGE = `InactiveTime must be one of: ${Object.values(InactiveTime).join(", ")}`;
export class CreateTransporterDto {

    @IsNotEmpty({ message: "username is required" })
    @IsString({ message: "username must be a string" })
    userName!: string;

    @IsNotEmpty({ message: "Password is required" })
    @IsPassword()
    password!: string;

    @Expose()
    @IsNotEmpty({ message: "Confirm Password is required" })
    confirmPassword!: string;

    @IsOptional()
    @IsMobileNumber()
    phone?: number;

    @IsNotEmpty({ message: "companyName is required" })
    @IsString({ message: "companyName must be a string" })
    companyName!: string;

    @IsOptional()
    @IsString({ message: "name must be a string" })
    name?: string;

    @IsOptional()
    @ToLowerCase()
    @IsString({ message: "Email must be a string" })
    email?: string;

    @IsOptional()
    @IsString({ message: "address must be a string" })
    address?: string;

    @Expose()
    @IsNotEmpty({ message: "Client is required" })
    @IsString({ message: "Client must be a string" })
    client!: string;

    @Expose()
    @IsNotEmpty({ message: "Language is required" })
    @IsString({ message: "Language must be a string" })
    language!: string;

    @IsOptional()
    @IsString({ message: "vehicle count must be a string" })
    vehicle_count?: string

    @IsNotEmpty()
    @IsString({ message: "TimeZone must be a string" })
    timezone!: string;

    @IsOptional()
    @IsEnum(Status, { message: STATUS_ENUM_MESSAGE })
    status?: Status;

    @IsEnum(InactiveTime, { message: INACTIVETIME_ENUM_MESSAGE })
    inactiveTime?: InactiveTime;

    @IsOptional()
    @IsString({ message: " must be a string" })
    reason?: string;

    @IsNotEmpty({ message: "Client is required" })
    @IsString({ message: "Client must be a string" })
    subscriptionStartDate!: string;

    @IsNotEmpty({ message: "Client is required" })
    @IsString({ message: "Client must be a string" })
    subscriptionDueDate!: string;

    @IsOptional()
    @IsString({ message: "subscriptionExtendDate must be a string" })
    subscriptionExtendDate?: string

    @IsOptional()
    @IsString({ message: "subscriptionExpiryCount must be a string" })
    subscriptionExpiryCount?: string

    @IsOptional()
    @IsString({ message: "maximumRadiusForNearestPOI must be a string" })
    maximumRadiusForNearestPOI?: string

    @IsOptional()
    @IsString({ message: "minimumDistanceForAddress must be a string" })
    minimumDistanceForAddress?: string

    @IsOptional()
    @IsString({ message: "dataRestriction must be a string" })
    dataRestriction?: string

}

export class updateTransporterDto {

    @IsOptional()
    @IsString({ message: "username must be a string" })
    userName?: string;

    @IsOptional()
    @IsPassword()
    password?: string;

    @Expose()
    @IsOptional()
    confirmPassword?: string;

    @IsOptional()
    @IsMobileNumber()
    phone?: number;

    @IsOptional()
    @IsString({ message: "companyName must be a string" })
    companyName?: string;

    @IsOptional()
    @IsString({ message: "name must be a string" })
    name?: string;

    @IsOptional()
    @ToLowerCase()
    @IsString({ message: "Email must be a string" })
    email?: string;

    @IsOptional()
    @IsString({ message: "address must be a string" })
    address?: string;

    @IsOptional()
    @IsString({ message: "Client must be a string" })
    client?: string;

    @IsOptional()
    @IsString({ message: "Language must be a string" })
    language?: string;

    @IsOptional()
    @IsString({ message: "vehicle count must be a string" })
    vehicle_count?: string

    @IsOptional()
    @IsString({ message: "TimeZone must be a string" })
    timezone?: string;

     @IsOptional()
    @IsEnum(Status, { message: STATUS_ENUM_MESSAGE })
    status?: Status;

     @IsOptional()
    @IsEnum(InactiveTime, { message: INACTIVETIME_ENUM_MESSAGE })
    inactiveTime?: InactiveTime;

    @IsOptional()
    @IsString({ message: "reason must be a string" })
    reason?: string;

    @IsOptional()
    @IsString({ message: "Client must be a string" })
    subscriptionStartDate?: string;

    @IsOptional()
    @IsString({ message: "Client must be a string" })
    subscriptionDueDate?: string;

    @IsOptional()
    @IsString({ message: "subscriptionExtendDate must be a string" })
    subscriptionExtendDate?: string

    @IsOptional()
    @IsString({ message: "subscriptionExpiryCount must be a string" })
    subscriptionExpiryCount?: string

    @IsOptional()
    @IsString({ message: "maximumRadiusForNearestPOI must be a string" })
    maximumRadiusForNearestPOI?: string

    @IsOptional()
    @IsString({ message: "minimumDistanceForAddress must be a string" })
    minimumDistanceForAddress?: string

    @IsOptional()
    @IsString({ message: "dataRestriction must be a string" })
    dataRestriction?: string

}