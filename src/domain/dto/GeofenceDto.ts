import { Transform } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { Status } from "../enums/status";
import { TransitTime } from "../enums/TransitTime";
import { GeofAssignType } from "../enums/GeofAssignType";
import { Shapes } from "../enums/Shapes";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

export class CreateGeofenceDto {
  @IsString()
  @IsNotEmpty({ message: "name is required" })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  name!: string;

  @IsString()
  @IsNotEmpty({ message: "type is required" })
  type!: string;

  @IsEnum(GeofAssignType, {
    message: enumMessage("assignType", GeofAssignType),
  })
  assignType!: GeofAssignType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  geofenceCode?: string;

  @IsOptional()
  @IsEnum(TransitTime, {
    message: enumMessage("transitTime", TransitTime),
  })
  transitTime?: TransitTime;

  @IsEnum(Shapes, { message: enumMessage("shapes", Shapes) })
  shapes!: Shapes;

  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { each: true })
  latitude!: number[];

  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { each: true })
  longitude!: number[];

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateGeofenceDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "name cannot be empty" })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  name?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "type is required" })
  type?: string;

  @IsOptional()
  @IsEnum(GeofAssignType, {
    message: enumMessage("assignType", GeofAssignType),
  })
  assignType?: GeofAssignType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  geofenceCode?: string | null;

  @IsOptional()
  @IsEnum(TransitTime, {
    message: enumMessage("transitTime", TransitTime),
  })
  transitTime?: TransitTime | null;

  @IsOptional()
  @IsEnum(Shapes, { message: enumMessage("shapes", Shapes) })
  shapes?: Shapes;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { each: true })
  latitude?: number[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { each: true })
  longitude?: number[];

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  reason?: string;
}
