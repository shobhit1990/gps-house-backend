import { Transform } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { Status } from "../enums/status";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

const trimString = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class CreateContactUsDto {
  @IsString()
  @IsNotEmpty({ message: "name is required" })
  @MaxLength(255)
  @Transform(trimString)
  name!: string;

  @IsString()
  @IsNotEmpty({ message: "mobile is required" })
  @Matches(/^\+?(?=(?:\D*\d){7,15}\D*$)[0-9\s().-]+$/, {
    message:
      "mobile must contain 7 to 15 digits and only valid phone characters",
  })
  @Transform(trimString)
  mobile!: string;

  @IsEmail({}, { message: "email must be a valid email address" })
  @IsNotEmpty({ message: "email is required" })
  @MaxLength(255)
  @Transform(trimString)
  email!: string;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trimString)
  reason?: string | null;
}

export class UpdateContactUsDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "name cannot be empty" })
  @MaxLength(255)
  @Transform(trimString)
  name?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "mobile cannot be empty" })
  @Matches(/^\+?(?=(?:\D*\d){7,15}\D*$)[0-9\s().-]+$/, {
    message:
      "mobile must contain 7 to 15 digits and only valid phone characters",
  })
  @Transform(trimString)
  mobile?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEmail({}, { message: "email must be a valid email address" })
  @IsNotEmpty({ message: "email cannot be empty" })
  @MaxLength(255)
  @Transform(trimString)
  email?: string;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trimString)
  reason?: string | null;
}
