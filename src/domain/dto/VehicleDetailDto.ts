import { Transform } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import { OwnerdBy } from "../enums/OwnedBy";
import { Status } from "../enums/status";
import { VehicleBodyType } from "../enums/VehicleBodyType";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

const trimString = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class CreateVehicleDetailDto {
  @IsString()
  @IsNotEmpty({ message: "client is required" })
  @Transform(trimString)
  client!: string;

  @IsString()
  @IsNotEmpty({ message: "transporter is required" })
  @Transform(trimString)
  transporter!: string;

  @IsString()
  @IsNotEmpty({ message: "vehicle is required" })
  @Transform(trimString)
  vehicle!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  ownerName?: string;

  @IsOptional()
  @IsEnum(OwnerdBy, { message: enumMessage("ownedBy", OwnerdBy) })
  ownedBy?: OwnerdBy;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  vehicleBrand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  vehicleModel?: string;

  @IsOptional()
  @IsEnum(VehicleBodyType, {
    message: enumMessage("vehicleBody", VehicleBodyType),
  })
  vehicleBody?: VehicleBodyType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsDateString()
  manufactureDate?: string;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trimString)
  reason?: string;
}

export class UpdateVehicleDetailDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "client cannot be empty" })
  @Transform(trimString)
  client?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "transporter cannot be empty" })
  @Transform(trimString)
  transporter?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "vehicle cannot be empty" })
  @Transform(trimString)
  vehicle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  ownerName?: string | null;

  @IsOptional()
  @IsEnum(OwnerdBy, { message: enumMessage("ownedBy", OwnerdBy) })
  ownedBy?: OwnerdBy | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  vehicleBrand?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  vehicleModel?: string | null;

  @IsOptional()
  @IsEnum(VehicleBodyType, {
    message: enumMessage("vehicleBody", VehicleBodyType),
  })
  vehicleBody?: VehicleBodyType | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity?: number | null;

  @IsOptional()
  @IsDateString()
  manufactureDate?: string | null;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string | null;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trimString)
  reason?: string | null;
}
