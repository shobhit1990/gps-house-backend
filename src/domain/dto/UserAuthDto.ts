import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { InactiveTime } from "../enums/InactiveTime";
import { UserType } from "../enums/UserType";
import { IsMobileNumber, IsPassword } from "../validators/UserValidators";

const trimOptional = ({ value }: { value: unknown }) =>
  value === null || value === undefined || value === ""
    ? undefined
    : typeof value === "string"
      ? value.trim() || undefined
      : value;

export class RegisterUserDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "userName must be a string" })
  @MaxLength(100)
  userName?: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "name must be a string" })
  @MaxLength(255)
  @IsNotEmpty({ message: "name is required" })
  name!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "companyName must be a string" })
  @MaxLength(255)
  companyName?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "contactPersonName must be a string" })
  @MaxLength(255)
  contactPersonName?: string;

  @IsEnum(UserType, {
    message: `userType must be one of: ${Object.values(UserType).join(", ")}`,
  })
  userType!: UserType;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() || undefined : value,
  )
  @IsEmail({}, { message: "email must be a valid email address" })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "contactNumber must be a string" })
  @IsMobileNumber()
  contactNumber?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "phone must be a string" })
  @IsMobileNumber()
  phone?: string;

  @IsString({ message: "password must be a string" })
  @IsPassword()
  @IsNotEmpty({ message: "password is required" })
  password!: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "imeiNumber must be a string" })
  @MaxLength(255)
  imeiNumber?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "address must be a string" })
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "companyAddress must be a string" })
  @MaxLength(1000)
  companyAddress?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "owner_name must be an owner ID" })
  owner_name?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "language must be a language ID" })
  language?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "timezone must be a time zone ID" })
  timezone?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "client must be a client user ID" })
  client?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "domain must be a string" })
  @MaxLength(255)
  domain?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "vehicleCount must be a string" })
  @MaxLength(255)
  vehicleCount?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return typeof value === "string" ? Number(value) : value;
  })
  @IsInt({ message: "maxVehicleCount must be an integer" })
  @Min(0)
  @Max(2147483647)
  maxVehicleCount?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  @IsBoolean({ message: "allowAllVehicleList must be a boolean" })
  allowAllVehicleList?: boolean;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "clientImage must be a string" })
  clientImage?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return typeof value === "string" ? Number(value) : value;
  })
  @IsEnum(InactiveTime, {
    message: `inactiveTime must be one of: ${Object.values(InactiveTime)
      .filter((value) => typeof value === "number")
      .join(", ")}`,
  })
  inactiveTime?: InactiveTime;

  @IsOptional()
  @IsDateString()
  subscriptionStartDate?: string;

  @IsOptional()
  @IsDateString()
  subscriptionDueDate?: string;

  @IsOptional()
  @IsDateString()
  subscriptionExtendDate?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(255)
  subscriptionExpiryCount?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(255)
  maxRadiusNearestPoi?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(255)
  maximumRadiusForNearestPOI?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(255)
  minDistanceForAddress?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(255)
  minimumDistanceForAddress?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString()
  @MaxLength(255)
  dataRestriction?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  @IsBoolean({ message: "overwriteSubscription must be a boolean" })
  overwriteSubscription?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  @IsBoolean({ message: "vehicleInactiveAfterExpiry must be a boolean" })
  vehicleInactiveAfterExpiry?: boolean;
}

export class LoginUserDto {
  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "userName must be a string" })
  @MaxLength(255)
  userName?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() || undefined : value,
  )
  @IsEmail({}, { message: "email must be a valid email address" })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "contactNumber must be a string" })
  @IsMobileNumber()
  contactNumber?: string;

  @IsString({ message: "password must be a string" })
  @IsNotEmpty({ message: "password is required" })
  password!: string;
}

export class RefreshTokenDto {
  @IsString({ message: "refreshToken must be a string" })
  @IsNotEmpty({ message: "refreshToken is required" })
  @MaxLength(128)
  refreshToken!: string;
}
