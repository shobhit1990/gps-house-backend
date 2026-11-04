import { Transform, Type } from "class-transformer";
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxDate,
  MaxLength,
  Min,
  MinDate,
  ValidateIf,
} from "class-validator";
import { Status } from "../enums/status";

const MAX_EXPENSE_AMOUNT = 9999999999.99;
const MIN_EXPENSE_DATE = new Date("1000-01-01T00:00:00.000Z");
const MAX_EXPENSE_DATE = new Date("9999-12-31T23:59:59.000Z");

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

const trimString = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

const toOptionalNumber = ({ value }: { value: unknown }) => {
  if (value === null || (typeof value === "string" && value.trim() === "")) {
    return null;
  }
  if (typeof value !== "string") {
    return value;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : value;
};

const toNumber = ({ value }: { value: unknown }) => {
  if (typeof value !== "string" || value.trim() === "") {
    return value;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : value;
};

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

  @Transform(toNumber)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.01)
  @Max(MAX_EXPENSE_AMOUNT)
  amount!: number;

  @Type(() => Date)
  @IsDate()
  @MinDate(MIN_EXPENSE_DATE)
  @MaxDate(MAX_EXPENSE_DATE)
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
  @Transform(toNumber)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.01)
  @Max(MAX_EXPENSE_AMOUNT)
  amount?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Date)
  @IsDate()
  @MinDate(MIN_EXPENSE_DATE)
  @MaxDate(MAX_EXPENSE_DATE)
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
