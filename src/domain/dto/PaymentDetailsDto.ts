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
import { PaymentTerm } from "../enums/PaymentTerm";
import { Status } from "../enums/status";
import { Type } from "../enums/Type";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

const trimString = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class CreatePaymentDetailsDto {
  @IsEnum(Type, { message: enumMessage("type", Type) })
  type!: Type;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: "transporter is required" })
  transporter!: string;

  /** Required only when type = vehicle */
  @ValidateIf((o: CreatePaymentDetailsDto) => o.type === Type.VEHICLE)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: "vehicle is required when type is vehicle" })
  vehicle?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @IsEnum(PaymentTerm, {
    message: enumMessage("paymentTerm", PaymentTerm),
  })
  paymentTerm!: PaymentTerm;

  @IsOptional()
  @IsDateString()
  installationDate?: string;

  @IsOptional()
  @IsDateString()
  rentalDueDate?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  technicianName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rental?: number;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(50)
  remark?: string;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  reason?: string;
}

export class UpdatePaymentDetailsDto {
  @IsOptional()
  @IsEnum(Type, { message: enumMessage("type", Type) })
  type?: Type;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: "transporter cannot be empty" })
  transporter?: string;

  /** Validated when type is vehicle or vehicle is sent */
  @ValidateIf(
    (o: UpdatePaymentDetailsDto) =>
      o.type === Type.VEHICLE ||
      (o.vehicle !== undefined && o.vehicle !== null && o.vehicle !== ""),
  )
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: "vehicle is required when type is vehicle" })
  vehicle?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @IsOptional()
  @IsEnum(PaymentTerm, {
    message: enumMessage("paymentTerm", PaymentTerm),
  })
  paymentTerm?: PaymentTerm;

  @IsOptional()
  @IsDateString()
  installationDate?: string;

  @IsOptional()
  @IsDateString()
  rentalDueDate?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  technicianName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rental?: number;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(50)
  remark?: string;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  reason?: string;
}
