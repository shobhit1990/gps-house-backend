import { Transform } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import { Status } from "../enums/status";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

const trimString = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

const emptyToNull = ({ value }: { value: unknown }) =>
  value === "" ? null : typeof value === "string" ? value.trim() : value;

export abstract class CertificateAddFields {
  @IsOptional()
  @Transform(({ value }) =>
    value === "" || value === null ? null : Number(value),
  )
  @IsInt()
  @Min(0)
  numberOfSos?: number | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsDateString()
  deviceInstallationDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  chassisNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  manufacturingCompany?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsDateString()
  vehicleManufacturingDate?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsDateString()
  registrationDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  engineNumber?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsDateString()
  lastFitnessDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  vehicleModel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  customerName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  @Transform(trimString)
  customerAddress?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  dealerName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  @Transform(trimString)
  dealerAddress?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  vtdModel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  vtdUniqueId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  invoiceNumber?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsDateString()
  invoiceDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  simIccidNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  ideaNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  bsnlNumber?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsUUID("all")
  rtoDistrict?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsUUID("all")
  rtoState?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  surname?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  fatherName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(trimString)
  panNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(trimString)
  aadhaarNo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  @Transform(trimString)
  remark?: string | null;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(emptyToNull)
  reason?: string | null;

  @IsOptional()
  @IsString()
  fitmentImage1?: string | null;

  @IsOptional()
  @IsString()
  fitmentImage2?: string | null;

  @IsOptional()
  @IsString()
  fitmentImage3?: string | null;

  @IsOptional()
  @IsString()
  fitmentImage4?: string | null;

  @IsOptional()
  @IsString()
  vendorLogo1?: string | null;

  @IsOptional()
  @IsString()
  vendorLogo2?: string | null;

  @IsOptional()
  @IsString()
  pancardLogo?: string | null;

  @IsOptional()
  @IsString()
  aadhaarFront?: string | null;

  @IsOptional()
  @IsString()
  aadhaarBack?: string | null;
}

export class CreateCertificateAddDto extends CertificateAddFields {
  @IsString()
  @IsUUID("all")
  vehicleNumber!: string;
}

export class UpdateCertificateAddDto extends CertificateAddFields {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsUUID("all")
  vehicleNumber?: string;
}
