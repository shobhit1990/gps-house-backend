import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Status } from "../enums/status";
import { IsDomain, IsMobileNumber, IsPassword } from "../validators/UserValidators";
import { ToLowerCase } from "../../utils/textNormalization";
import { Expose } from "class-transformer";

const STATUS_ENUM_MESSAGE = `Status must be one of: ${Object.values(Status).join(", ")}`;

export class CreateClientDto {

    @IsNotEmpty({ message: "Owner Name is required" })
    @IsString({ message: "Owner Name must be a string" })
    owner_name!: string;

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
    @IsNotEmpty({ message: "Language is required" })
    @IsString({ message: "Language must be a string" })
    language!: string;

    @IsOptional()
    @IsDomain()
    domain?: string;

    @IsOptional()
    @IsString({ message: "vehicle count must be a string" })
    vehicle_count?: string

    @IsNotEmpty()
    @IsString({ message: "TimeZone must be a string" })
    timezone!: string;

    @IsOptional()
    @IsString()
    clientImage?: string;

    @IsEnum(Status, { message: STATUS_ENUM_MESSAGE })
    status?: Status;

    @IsOptional()
    @IsString({ message: " must be a string" })
    reason?: string;

    @IsOptional()
    @IsString()
    imeiNumber?: string;
}

export class UpdateClientDto {

    @IsOptional()
    @IsString({ message: "Owner Name must be a string" })
    owner_name?: string;

    @IsOptional()
    @IsString({ message: "username must be a string" })
    userName?: string;

    @IsOptional()
    @IsPassword()
    password?: string;

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
    @IsString({ message: "Language must be a string" })
    language?: string;

    @IsOptional()
    @IsDomain()
    domain?: string;

    @IsOptional()
    @IsString({ message: "vehicle count must be a string" })
    vehicle_count?: string

    @IsOptional()
    @IsString({ message: "TimeZone must be a string" })
    timezone?: string;

    @IsOptional()
    @IsString()
    clientImage?: string;

    @IsOptional()
    @IsEnum(Status, { message: STATUS_ENUM_MESSAGE })
    status?: Status;

    @IsOptional()
    @IsString({ message: " must be a string" })
    reason?: string;
}