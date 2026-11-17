import { Transform } from "class-transformer";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { Status } from "../enums/status";

export class CreateLicenseDto {
  @IsString()
  @IsNotEmpty({ message: "license is required" })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  license!: string;
}

export class UpdateLicenseDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "license cannot be empty" })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  license?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @IsOptional()
  @IsString()
  reason?: string;
}
