import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { IsName } from "../validators/UserValidators";
import { ToProperCase } from "../../utils/textNormalization";
import { Status } from "../enums/status";

const STATUS_ENUM_MESSAGE = `Status must be one of: ${Object.values(Status).join(", ")}`;

export class CreateRoleDto {
  @IsNotEmpty({ message: "roleCode is required" })
  @IsString({ message: "roleCode must be a string" })
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  roleCode!: string;

  @IsNotEmpty({ message: "name is required" })
  @ToProperCase()
  @IsString({ message: "name must be a string" })
  @MaxLength(255)
  @IsName()
  name!: string;

  @IsOptional()
  @IsEnum(Status, { message: STATUS_ENUM_MESSAGE })
  status?: Status;

  @IsOptional()
  @IsString({ message: "Reason must be a string" })
  @MaxLength(1000)
  reason?: string;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString({ message: "roleCode must be a string" })
  @IsNotEmpty({ message: "roleCode cannot be empty" })
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  roleCode?: string;

  @IsOptional()
  @IsNotEmpty({ message: "name cannot be empty" })
  @ToProperCase()
  @IsString({ message: "name must be a string" })
  @MaxLength(255)
  @IsName()
  name?: string;

  @IsOptional()
  @IsEnum(Status, { message: STATUS_ENUM_MESSAGE })
  status?: Status;

  @IsOptional()
  @IsString({ message: "Reason must be a string" })
  @MaxLength(1000)
  reason?: string;
}

export class UpdateRoleStatusDto {
  @IsEnum(Status, { message: STATUS_ENUM_MESSAGE })
  status!: Status;

  @IsOptional()
  @IsString({ message: "Reason must be a string" })
  @MaxLength(1000)
  reason?: string;
}
