import { Transform } from "class-transformer";
import {
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { Status } from "../enums/status";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

export class CreateJobsheetDto {
  @IsOptional()
  @IsString()
  @IsUUID("all", { message: "vehicle must be a valid vehicle ID" })
  vehicle?: string | null;

  @IsDefined({ message: "technician is required" })
  @IsString()
  @IsNotEmpty({ message: "technician is required" })
  @MaxLength(255)
  @IsUUID("all", { message: "technician must be a valid technician ID" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  technician!: string;

  @IsDefined({ message: "contactPersonName is required" })
  @IsString()
  @IsNotEmpty({ message: "contactPersonName is required" })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  contactPersonName!: string;

  @IsDefined({ message: "phone is required" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(/^\+?(?=(?:\D*\d){7,15}\D*$)[0-9\s().-]+$/, {
    message:
      "phone must contain 7 to 15 digits and only valid phone characters",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  orderNo?: string;

  @IsOptional()
  @IsString()
  instruction?: string;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateJobsheetDto {
  @IsOptional()
  @IsString()
  @IsUUID("all", { message: "vehicle must be a valid vehicle ID" })
  vehicle?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "technician cannot be empty" })
  @MaxLength(255)
  @IsUUID("all", { message: "technician must be a valid technician ID" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  technician?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "contactPersonName cannot be empty" })
  @MaxLength(255)
  contactPersonName?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(/^\+?(?=(?:\D*\d){7,15}\D*$)[0-9\s().-]+$/, {
    message:
      "phone must contain 7 to 15 digits and only valid phone characters",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  phone?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  orderNo?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  instruction?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  reason?: string;
}
