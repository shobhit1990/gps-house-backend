import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { PaymentMode } from "../enums/PymentMode";
import { Status } from "../enums/status";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

export class CreateBillingDetailDto {
  @IsString()
  @MaxLength(255)
  transporter!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  billingName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  gstNumber?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  billingEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  billingPhone?: string;

  @IsOptional()
  @IsString()
  billingAddress?: string;

  @IsOptional()
  @IsEnum(PaymentMode, {
    message: enumMessage("paymentMode", PaymentMode),
  })
  paymentMode?: PaymentMode;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateBillingDetailDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  transporter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  billingName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  gstNumber?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  billingEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  billingPhone?: string;

  @IsOptional()
  @IsString()
  billingAddress?: string;

  @IsOptional()
  @IsEnum(PaymentMode, {
    message: enumMessage("paymentMode", PaymentMode),
  })
  paymentMode?: PaymentMode;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  reason?: string;
}
