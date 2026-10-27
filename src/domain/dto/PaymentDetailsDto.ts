import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { PaymentTerm } from "../enums/PaymentTerm";
import { Status } from "../enums/status";
import { Type } from "../enums/Type";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

export class CreatePaymentDetailsDto {
  @IsOptional()
  @IsEnum(Type, { message: enumMessage("type", Type) })
  type?: Type;

  @IsString()
  @IsNotEmpty()
  transporter!: string;

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
  @IsString()
  technicianName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rental?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  remark?: string;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdatePaymentDetailsDto {
  @IsOptional()
  @IsEnum(Type, { message: enumMessage("type", Type) })
  type?: Type;

  @IsOptional()
  @IsString()
  transporter?: string;

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
  @IsString()
  technicianName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rental?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  remark?: string;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  reason?: string;
}
