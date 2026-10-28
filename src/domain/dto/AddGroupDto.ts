import { Transform } from "class-transformer";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { Status } from "../enums/status";
import { Type } from "../enums/Type";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

export class CreateAddGroupDto {
  @IsString()
  @IsNotEmpty({ message: "groupName is required" })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  groupName!: string;

  @IsEnum(Type, { message: enumMessage("assignedTo", Type) })
  assignedTo!: Type;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateAddGroupDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "groupName cannot be empty" })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  groupName?: string;

  @IsOptional()
  @IsEnum(Type, { message: enumMessage("assignedTo", Type) })
  assignedTo?: Type;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  reason?: string;
}
