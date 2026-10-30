import { Transform } from "class-transformer";
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { AlertAssignType } from "../enums/AlertAssignType";
import { Status } from "../enums/status";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

export class CreateAlertDto {
  @IsString()
  @IsNotEmpty({ message: "alertName is required" })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  alertName!: string;

  @IsOptional()
  @IsEnum(AlertAssignType, {
    message: enumMessage("alertAssignedTo", AlertAssignType),
  })
  alertAssignedTo?: AlertAssignType;

  @IsOptional()
  @IsUUID("all")
  assignedToId?: string;

  @IsOptional()
  @IsUUID("all")
  transporter?: string;

  @IsOptional()
  @IsUUID("all")
  user?: string;

  @IsOptional()
  @IsUUID("all")
  group?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: "At least one vehicle is required" })
  @ArrayUnique({ message: "vehicleIds must not contain duplicates" })
  @IsUUID("all", { each: true })
  vehicleIds?: string[];

  @IsOptional()
  @IsUUID("all")
  vehicle?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: "At least one alert type is required" })
  @ArrayUnique({ message: "alertTypeIds must not contain duplicates" })
  @IsUUID("all", { each: true })
  alertTypeIds?: string[];

  @IsOptional()
  @IsUUID("all")
  alertType?: string;

  @IsOptional()
  @IsBoolean()
  mobile?: boolean;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  reason?: string;
}

export class UpdateAlertDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "alertName cannot be empty" })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  alertName?: string;

  @IsOptional()
  @IsEnum(AlertAssignType, {
    message: enumMessage("alertAssignedTo", AlertAssignType),
  })
  alertAssignedTo?: AlertAssignType;

  @IsOptional()
  @IsUUID("all")
  assignedToId?: string;

  @IsOptional()
  @IsUUID("all")
  transporter?: string;

  @IsOptional()
  @IsUUID("all")
  user?: string;

  @IsOptional()
  @IsUUID("all")
  group?: string;

  @IsOptional()
  @IsUUID("all")
  vehicleId?: string;

  @IsOptional()
  @IsUUID("all")
  vehicle?: string;

  @IsOptional()
  @IsUUID("all")
  alertTypeId?: string;

  @IsOptional()
  @IsUUID("all")
  alertType?: string;

  @IsOptional()
  @IsBoolean()
  mobile?: boolean;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  reason?: string;
}
