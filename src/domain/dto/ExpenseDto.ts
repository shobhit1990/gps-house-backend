import { Transform, Type } from "class-transformer";
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import { Status } from "../enums/status";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

const trimString = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

const toOptionalNumber = ({ value }: { value: unknown }) =>
  value === "" || value === null ? null : Number(value);

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty({ message: "client is required" })
  client!: string;

  @IsString()
  @IsNotEmpty({ message: "transporter is required" })
  transporter!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  expenseName?: string | null;

  @IsString()
  @IsNotEmpty({ message: "expenseType is required" })
  expenseType!: string;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.01)
  amount!: number;

  @Type(() => Date)
  @IsDate()
  expenseDate!: Date;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  odometer?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  engineHours?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimString)
  description?: string | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  quantity?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  supplier?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  buyer?: string | null;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trimString)
  reason?: string | null;
}

export class UpdateExpenseDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "client cannot be empty" })
  client?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "transporter cannot be empty" })
  transporter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  expenseName?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "expenseType cannot be empty" })
  expenseType?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.01)
  amount?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Date)
  @IsDate()
  expenseDate?: Date;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  odometer?: number | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  engineHours?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trimString)
  description?: string | null;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  quantity?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  supplier?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  buyer?: string | null;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trimString)
  reason?: string | null;
}
