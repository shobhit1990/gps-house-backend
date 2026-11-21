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

const trimString = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class CreateAddGroupDto {
  @IsString()
  @IsNotEmpty({ message: "groupName is required" })
  @MaxLength(255)
  @Transform(trimString)
  groupName!: string;

  @IsEnum(Type, { message: enumMessage("assignedTo", Type) })
  assignedTo!: Type;

  /** Required when assignedTo is vehicle — master vehicle externalId. */
  @ValidateIf((object: CreateAddGroupDto) => object.assignedTo === Type.VEHICLE)
  @IsString()
  @IsNotEmpty({ message: "vehicle is required when assignedTo is vehicle" })
  @Transform(trimString)
  vehicle?: string;

  /** Required when assignedTo is transporter — master transporter externalId. */
  @ValidateIf(
    (object: CreateAddGroupDto) => object.assignedTo === Type.TRANSPORTER,
  )
  @IsString()
  @IsNotEmpty({
    message: "transporter is required when assignedTo is transporter",
  })
  @Transform(trimString)
  transporter?: string;

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
  @Transform(trimString)
  groupName?: string;

  @IsOptional()
  @IsEnum(Type, { message: enumMessage("assignedTo", Type) })
  assignedTo?: Type;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "vehicle cannot be empty" })
  @Transform(trimString)
  vehicle?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "transporter cannot be empty" })
  @Transform(trimString)
  transporter?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  reason?: string;
}
