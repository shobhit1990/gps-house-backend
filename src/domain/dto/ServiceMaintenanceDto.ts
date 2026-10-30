import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { Status } from "../enums/status";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

const emptyToNull = (value: unknown) => (value === "" ? null : value);

const numberOrNull = ({ value }: { value: unknown }) => {
  const normalized = emptyToNull(value);
  if (normalized === null) return null;
  return typeof normalized === "number" ? normalized : Number(normalized);
};

const integerOrNull = ({ value }: { value: unknown }) => {
  const normalized = emptyToNull(value);
  if (normalized === null) return null;
  return typeof normalized === "number" ? normalized : Number(normalized);
};

const booleanFromForm = ({ value }: { value: unknown }) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
};

const dateOrNull = ({ value }: { value: unknown }) => emptyToNull(value);

abstract class ServiceMaintenanceFields {
  @IsOptional()
  @IsBoolean()
  @Transform(booleanFromForm)
  odometerIntervalEnabled?: boolean;

  @IsOptional()
  @Transform(numberOrNull)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  odometerInterval?: number | null;

  @IsOptional()
  @Transform(numberOrNull)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  lastServiceOdometer?: number | null;

  @IsOptional()
  @IsBoolean()
  @Transform(booleanFromForm)
  engineIntervalEnabled?: boolean;

  @IsOptional()
  @Transform(numberOrNull)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  engineInterval?: number | null;

  @IsOptional()
  @Transform(numberOrNull)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  lastServiceEngine?: number | null;

  @IsOptional()
  @IsBoolean()
  @Transform(booleanFromForm)
  daysIntervalEnabled?: boolean;

  @IsOptional()
  @Transform(integerOrNull)
  @IsInt()
  daysInterval?: number | null;

  @IsOptional()
  @Transform(dateOrNull)
  @IsDateString()
  lastServiceDate?: string | null;

  @IsOptional()
  @IsBoolean()
  @Transform(booleanFromForm)
  odometerLeftEnabled?: boolean;

  @IsOptional()
  @Transform(numberOrNull)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  odometerLeft?: number | null;

  @IsOptional()
  @IsBoolean()
  @Transform(booleanFromForm)
  engineLeftEnabled?: boolean;

  @IsOptional()
  @Transform(numberOrNull)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  engineLeft?: number | null;

  @IsOptional()
  @IsBoolean()
  @Transform(booleanFromForm)
  daysLeftEnabled?: boolean;

  @IsOptional()
  @Transform(integerOrNull)
  @IsInt()
  daysLeft?: number | null;

  @IsOptional()
  @IsBoolean()
  @Transform(booleanFromForm)
  updateRecord?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(booleanFromForm)
  mobile?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(booleanFromForm)
  allowVisibilityToDriver?: boolean;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  reason?: string | null;
}

export class CreateServiceMaintenanceDto extends ServiceMaintenanceFields {
  @IsString()
  @IsNotEmpty({ message: "serviceName is required" })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  serviceName!: string;

  @IsUUID("all")
  vehicle!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  remark?: string | null;
}

export class UpdateServiceMaintenanceDto extends ServiceMaintenanceFields {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "serviceName cannot be empty" })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  serviceName?: string;

  @IsOptional()
  @IsUUID("all")
  vehicle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  remark?: string | null;

  @IsOptional()
  @IsBoolean()
  @Transform(booleanFromForm)
  removeServiceDocument?: boolean;
}
