import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from "class-validator";
import { Expose } from "class-transformer";
import { Status } from "../enums/status";
import { IsMobileNumber, IsPassword } from "../validators/UserValidators";

const STATUS_ENUM_MESSAGE = `Status must be one of: ${Object.values(Status).join(", ")}`;

export class CreateTechnicianDto {
  @IsNotEmpty({ message: "Username is required" })
  @IsString({ message: "Username must be a string" })
  @Matches(/^[A-Za-z0-9_@*-]+$/, {
    message: "Username contains invalid characters",
  })
  userName!: string;

  @IsNotEmpty({ message: "Password is required" })
  @IsPassword()
  password!: string;

  @Expose()
  @IsNotEmpty({ message: "Confirm Password is required" })
  @IsString()
  confirmPassword!: string;

  @IsNotEmpty({ message: "Company Name is required" })
  @IsString({ message: "Company Name must be a string" })
  companyName!: string;

  @IsNotEmpty({ message: "Timezone is required" })
  @IsString({ message: "Timezone must be a timezone ID" })
  timezone!: string;

  @IsOptional()
  @IsString({ message: "Name must be a string" })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: "Email must be a valid email address" })
  email?: string;

  @IsOptional()
  @IsMobileNumber()
  phone?: number;

  @IsOptional()
  @IsString({ message: "Address must be a string" })
  address?: string;

  @Expose()
  @IsNotEmpty({ message: "Client is required" })
  @IsString({ message: "Client must be a client ID" })
  client!: string;

  @IsOptional()
  @IsEnum(Status, { message: STATUS_ENUM_MESSAGE })
  status?: Status;

  @IsOptional()
  @IsString({ message: "Reason must be a string" })
  reason?: string;
}

export class UpdateTechnicianDto {
  @IsOptional()
  @IsString({ message: "Username must be a string" })
  @Matches(/^[A-Za-z0-9_@*-]+$/, {
    message: "Username contains invalid characters",
  })
  userName?: string;

  @IsOptional()
  @IsPassword()
  password?: string;

  @IsOptional()
  @IsString()
  confirmPassword?: string;

  @IsOptional()
  @IsString({ message: "Company Name must be a string" })
  companyName?: string;

  @IsOptional()
  @IsString({ message: "Timezone must be a timezone ID" })
  timezone?: string;

  @IsOptional()
  @IsString({ message: "Name must be a string" })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: "Email must be a valid email address" })
  email?: string;

  @IsOptional()
  @IsMobileNumber()
  phone?: number;

  @IsOptional()
  @IsString({ message: "Address must be a string" })
  address?: string;

  @IsOptional()
  @IsString({ message: "Client must be a client ID" })
  client?: string;

  @IsOptional()
  @IsEnum(Status, { message: STATUS_ENUM_MESSAGE })
  status?: Status;

  @IsOptional()
  @IsString({ message: "Reason must be a string" })
  reason?: string;
}
