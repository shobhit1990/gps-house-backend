import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Minutes } from "../enums/Minutes";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

const trimToUndefined = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() || undefined : raw;
};

export class StoppageSummaryFilterDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "client cannot be empty" })
  @Transform(({ value }) => trimToUndefined(value))
  client?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "transporter cannot be empty" })
  @Transform(({ value }) => trimToUndefined(value))
  transporter?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "vehicle cannot be empty" })
  @Transform(({ value }) => trimToUndefined(value))
  vehicle?: string;

  @IsEnum(Minutes, { message: enumMessage("duration", Minutes) })
  @Transform(({ value }) => {
    const normalized = trimToUndefined(value);
    return normalized === undefined ? normalized : String(normalized);
  })
  duration!: Minutes;

  @IsString()
  @IsNotEmpty({ message: "startDate is required" })
  @Transform(({ value }) => trimToUndefined(value))
  startDate!: string;

  @IsString()
  @IsNotEmpty({ message: "endDate is required" })
  @Transform(({ value }) => trimToUndefined(value))
  endDate!: string;
}
