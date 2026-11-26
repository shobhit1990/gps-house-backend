import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { AlertOperation } from "../enums/AlertOperation";
import { GeofenceRestrictionType } from "../enums/GeofenceRestrictionType";
import { Status } from "../enums/status";
import { TripRestrictionType } from "../enums/TripRestrictionType";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

const trimString = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

const booleanFromForm = ({ value }: { value: unknown }) => {
  if (value === "true" || value === "1" || value === "on") return true;
  if (value === "false" || value === "0") return false;
  return value;
};

export class CreateCustomAlertDto {
  @IsString()
  @IsNotEmpty({ message: "alertName is required" })
  @MaxLength(255)
  @Transform(trimString)
  alertName!: string;

  @IsOptional()
  @IsUUID("all")
  sensor?: string;

  @IsEnum(AlertOperation, {
    message: enumMessage("operation", AlertOperation),
  })
  operation!: AlertOperation;

  @IsString()
  @IsNotEmpty({ message: "value is required" })
  @MaxLength(255)
  @Transform(trimString)
  value!: string;

  @IsOptional()
  @Transform(booleanFromForm)
  @IsBoolean()
  enableGeofenceRestrictions?: boolean;

  @ValidateIf((dto) => dto.enableGeofenceRestrictions === true)
  @IsEnum(GeofenceRestrictionType, {
    message: enumMessage("geofenceSelectType", GeofenceRestrictionType),
  })
  @IsNotEmpty({
    message: "geofenceSelectType is required when geofence restrictions are enabled",
  })
  geofenceSelectType?: GeofenceRestrictionType;

  @IsOptional()
  @Transform(booleanFromForm)
  @IsBoolean()
  enableTripRestrictions?: boolean;

  @ValidateIf((dto) => dto.enableTripRestrictions === true)
  @IsEnum(TripRestrictionType, {
    message: enumMessage("tripSelectType", TripRestrictionType),
  })
  @IsNotEmpty({
    message: "tripSelectType is required when trip restrictions are enabled",
  })
  tripSelectType?: TripRestrictionType;

  @IsString()
  @IsNotEmpty({ message: "subject is required" })
  @MaxLength(255)
  @Transform(trimString)
  subject!: string;

  @IsString()
  @IsNotEmpty({ message: "messageBody is required" })
  @MaxLength(50000)
  @Transform(trimString)
  messageBody!: string;

  @IsOptional()
  @Transform(booleanFromForm)
  @IsBoolean()
  mobile?: boolean;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trimString)
  reason?: string | null;
}

export class UpdateCustomAlertDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "alertName cannot be empty" })
  @MaxLength(255)
  @Transform(trimString)
  alertName?: string;

  @IsOptional()
  @IsUUID("all")
  sensor?: string;

  @IsOptional()
  @IsEnum(AlertOperation, {
    message: enumMessage("operation", AlertOperation),
  })
  operation?: AlertOperation;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "value cannot be empty" })
  @MaxLength(255)
  @Transform(trimString)
  value?: string;

  @IsOptional()
  @Transform(booleanFromForm)
  @IsBoolean()
  enableGeofenceRestrictions?: boolean;

  @ValidateIf(
    (dto) =>
      dto.enableGeofenceRestrictions === true ||
      (dto.enableGeofenceRestrictions === undefined &&
        dto.geofenceSelectType !== undefined),
  )
  @IsEnum(GeofenceRestrictionType, {
    message: enumMessage("geofenceSelectType", GeofenceRestrictionType),
  })
  geofenceSelectType?: GeofenceRestrictionType | null;

  @IsOptional()
  @Transform(booleanFromForm)
  @IsBoolean()
  enableTripRestrictions?: boolean;

  @ValidateIf(
    (dto) =>
      dto.enableTripRestrictions === true ||
      (dto.enableTripRestrictions === undefined &&
        dto.tripSelectType !== undefined),
  )
  @IsEnum(TripRestrictionType, {
    message: enumMessage("tripSelectType", TripRestrictionType),
  })
  tripSelectType?: TripRestrictionType | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "subject cannot be empty" })
  @MaxLength(255)
  @Transform(trimString)
  subject?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "messageBody cannot be empty" })
  @MaxLength(50000)
  @Transform(trimString)
  messageBody?: string;

  @IsOptional()
  @Transform(booleanFromForm)
  @IsBoolean()
  mobile?: boolean;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trimString)
  reason?: string | null;
}
