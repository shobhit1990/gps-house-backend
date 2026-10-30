import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { SimOperator } from "../enums/SimOperator";
import { Status } from "../enums/status";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

const trimString = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class CreateDeviceDto {
  @IsString()
  @IsNotEmpty({ message: "imei is required" })
  @MaxLength(30)
  @Transform(trimString)
  imei!: string;

  @IsString()
  @Matches(/^\d{24}$/, {
    message: "simNumber must contain exactly 24 digits",
  })
  @Transform(trimString)
  simNumber!: string;

  @IsEnum(SimOperator, {
    message: enumMessage("simOperator", SimOperator),
  })
  simOperator!: SimOperator;

  @IsOptional()
  @IsString()
  @Matches(/^\d{24}$/, {
    message: "secondarySimNumber must contain exactly 24 digits",
  })
  @Transform(trimString)
  secondarySimNumber?: string | null;

  @IsOptional()
  @IsEnum(SimOperator, {
    message: enumMessage("secondarySimOperator", SimOperator),
  })
  secondarySimOperator?: SimOperator | null;

  @IsString()
  @IsNotEmpty({ message: "deviceType is required" })
  @Transform(trimString)
  deviceType!: string;

  @IsString()
  @IsNotEmpty({ message: "client is required" })
  @Transform(trimString)
  client!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  password?: string | null;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trimString)
  reason?: string | null;

  @IsOptional()
  @IsBoolean()
  ignitionWireConnected?: boolean;

  @IsOptional()
  @IsBoolean()
  ignitionWireNotConnected?: boolean;

  @IsOptional()
  @IsBoolean()
  airConditionWireConnected?: boolean;

  @IsOptional()
  @IsBoolean()
  attendance?: boolean;

  @IsOptional()
  @IsBoolean()
  timezoneSetting?: boolean;
}

export class UpdateDeviceDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "imei cannot be empty" })
  @MaxLength(30)
  @Transform(trimString)
  imei?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Matches(/^\d{24}$/, {
    message: "simNumber must contain exactly 24 digits",
  })
  @Transform(trimString)
  simNumber?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(SimOperator, {
    message: enumMessage("simOperator", SimOperator),
  })
  simOperator?: SimOperator;

  @IsOptional()
  @IsString()
  @Matches(/^\d{24}$/, {
    message: "secondarySimNumber must contain exactly 24 digits",
  })
  @Transform(trimString)
  secondarySimNumber?: string | null;

  @IsOptional()
  @IsEnum(SimOperator, {
    message: enumMessage("secondarySimOperator", SimOperator),
  })
  secondarySimOperator?: SimOperator | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "deviceType cannot be empty" })
  @Transform(trimString)
  deviceType?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "client cannot be empty" })
  @Transform(trimString)
  client?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  password?: string | null;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trimString)
  reason?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  ignitionWireConnected?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  ignitionWireNotConnected?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  airConditionWireConnected?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  attendance?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  timezoneSetting?: boolean;
}
