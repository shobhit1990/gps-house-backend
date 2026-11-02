import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { Status } from "../enums/status";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

export class CreateVehicleConfigDto {
  @IsString()
  @IsUUID()
  transporter!: string;

  @Type(() => Number)
  @IsNumber()
  distanceVariation!: number;

  @IsBoolean()
  lockButton!: boolean;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string | null;
}

export class UpdateVehicleConfigDto {
  @IsOptional()
  @IsString()
  @IsUUID()
  transporter?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  distanceVariation?: number;

  @IsOptional()
  @IsBoolean()
  lockButton?: boolean;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string | null;
}
