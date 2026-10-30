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
import { AssignType } from "../enums/AssignType";
import { InventoryType } from "../enums/InventoryType";
import { SimOperator } from "../enums/SimOperator";
import { Status } from "../enums/status";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;
const trimOptional = (value: unknown) =>
  typeof value === "string" ? value.trim() || undefined : value;

export class CreateAddInventoryDto {
  @IsEnum(InventoryType, {
    message: enumMessage("inventoryType", InventoryType),
  })
  inventoryType!: InventoryType;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Transform(({ value }) => trimOptional(value))
  imei?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{24}$/, {
    message: "simNumber must contain exactly 24 digits",
  })
  @Transform(({ value }) => trimOptional(value))
  simNumber?: string | null;

  @IsEnum(SimOperator, {
    message: enumMessage("simOperator", SimOperator),
  })
  simOperator!: SimOperator;

  @IsOptional()
  @IsString()
  @Matches(/^\d{24}$/, {
    message: "secondarySimNumber must contain exactly 24 digits",
  })
  @Transform(({ value }) => trimOptional(value))
  secondarySimNumber?: string | null;

  @IsOptional()
  @IsEnum(SimOperator, {
    message: enumMessage("secondarySimOperator", SimOperator),
  })
  secondarySimOperator?: SimOperator;

  @IsString()
  @IsNotEmpty({ message: "deviceType is required" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  deviceType!: string;

  @IsEnum(AssignType, { message: enumMessage("assignType", AssignType) })
  assignType!: AssignType;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "client cannot be empty" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  client?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "technician cannot be empty" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  technician?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  password?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  ignitionWireConnected?: boolean;

  @IsOptional()
  @IsBoolean()
  airConditionWireConnected?: boolean;

  @IsOptional()
  @IsBoolean()
  analogSensor?: boolean;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => trimOptional(value))
  reason?: string | null;
}

export class UpdateAddInventoryDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(InventoryType, {
    message: enumMessage("inventoryType", InventoryType),
  })
  inventoryType?: InventoryType;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Transform(({ value }) => trimOptional(value))
  imei?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{24}$/, {
    message: "simNumber must contain exactly 24 digits",
  })
  @Transform(({ value }) => trimOptional(value))
  simNumber?: string | null;

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
  @Transform(({ value }) => trimOptional(value))
  secondarySimNumber?: string | null;

  @IsOptional()
  @IsEnum(SimOperator, {
    message: enumMessage("secondarySimOperator", SimOperator),
  })
  secondarySimOperator?: SimOperator | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "deviceType cannot be empty" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  deviceType?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(AssignType, { message: enumMessage("assignType", AssignType) })
  assignType?: AssignType;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "client cannot be empty" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  client?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "technician cannot be empty" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  technician?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  password?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  ignitionWireConnected?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  airConditionWireConnected?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  analogSensor?: boolean;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => trimOptional(value))
  reason?: string | null;
}
