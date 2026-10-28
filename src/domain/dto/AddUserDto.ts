import { Transform } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Status } from "../enums/status";
import { IsMobileNumber, IsPassword } from "../validators/UserValidators";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;
const trimOptional = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() || undefined : value;

export class AddUserDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "userName must be a string" })
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9_*@-]+$/, {
    message: "userName may contain only letters, numbers, _, -, *, and @",
  })
  @IsNotEmpty({ message: "userName is required" })
  userName!: string;

  @IsString({ message: "password must be a string" })
  @IsPassword()
  @IsNotEmpty({ message: "password is required" })
  password!: string;

  @IsString({ message: "confirmPassword must be a string" })
  @IsNotEmpty({ message: "confirmPassword is required" })
  confirmPassword!: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "group must be a group ID" })
  @IsNotEmpty({ message: "group is required" })
  group!: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "timezone must be a time zone ID" })
  @IsNotEmpty({ message: "timezone is required" })
  timezone!: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "companyName must be a string" })
  @MaxLength(255)
  @IsNotEmpty({ message: "companyName is required" })
  companyName!: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "contactPersonName must be a string" })
  @MaxLength(255)
  contactPersonName?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() || undefined : value,
  )
  @IsEmail({}, { message: "email must be a valid email address" })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "phone must be a string" })
  @IsMobileNumber()
  phone?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "companyAddress must be a string" })
  @MaxLength(1000)
  companyAddress?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return typeof value === "string" ? Number(value) : value;
  })
  @IsInt({ message: "dataRestrictionDays must be an integer" })
  @Min(0, { message: "dataRestrictionDays must be zero or greater" })
  @Max(36500, { message: "dataRestrictionDays is too large" })
  dataRestrictionDays?: number;

  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "reason must be a string" })
  @MaxLength(1000)
  reason?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  @IsBoolean({ message: "isSchoolUser must be a boolean" })
  isSchoolUser?: boolean;
}

export class UpdateUserDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "userName must be a string" })
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9_*@-]+$/, {
    message: "userName may contain only letters, numbers, _, -, *, and @",
  })
  @IsNotEmpty({ message: "userName cannot be empty" })
  userName?: string;

  @IsOptional()
  @IsString({ message: "password must be a string" })
  @IsPassword()
  @IsNotEmpty({ message: "password cannot be empty" })
  password?: string;

  @IsOptional()
  @IsString({ message: "confirmPassword must be a string" })
  @IsNotEmpty({ message: "confirmPassword cannot be empty" })
  confirmPassword?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "group must be a group ID" })
  @IsNotEmpty({ message: "group cannot be empty" })
  group?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "timezone must be a time zone ID" })
  @IsNotEmpty({ message: "timezone cannot be empty" })
  timezone?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString({ message: "companyName must be a string" })
  @MaxLength(255)
  @IsNotEmpty({ message: "companyName cannot be empty" })
  companyName?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "contactPersonName must be a string" })
  @MaxLength(255)
  contactPersonName?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() || undefined : value,
  )
  @IsEmail({}, { message: "email must be a valid email address" })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "phone must be a string" })
  @IsMobileNumber()
  phone?: string;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "companyAddress must be a string" })
  @MaxLength(1000)
  companyAddress?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return typeof value === "string" ? Number(value) : value;
  })
  @IsInt({ message: "dataRestrictionDays must be an integer" })
  @Min(0, { message: "dataRestrictionDays must be zero or greater" })
  @Max(36500, { message: "dataRestrictionDays is too large" })
  dataRestrictionDays?: number;

  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @Transform(trimOptional)
  @IsString({ message: "reason must be a string" })
  @MaxLength(1000)
  reason?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  @IsBoolean({ message: "isSchoolUser must be a boolean" })
  isSchoolUser?: boolean;
}
