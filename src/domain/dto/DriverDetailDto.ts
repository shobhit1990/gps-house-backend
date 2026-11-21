import { Transform, Type } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { Status } from "../enums/status";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

const trimString = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class DriverDocumentDto {
  @IsString({ message: "Document name must be a string" })
  @IsNotEmpty({ message: "Document name is required" })
  @MaxLength(255)
  @Transform(trimString)
  documentName!: string;

  @IsString({ message: "Upload document must be a string" })
  @IsNotEmpty({ message: "Upload document is required" })
  @Transform(trimString)
  uploadDocument!: string;
}

class DriverDetailFields {
  @IsOptional()
  @IsString()
  @Transform(trimString)
  transporter?: string | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @Transform(trimString)
  deviceId?: string | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsDateString({ strict: true })
  dateOfJoining?: string | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsDateString({ strict: true })
  dateOfLeaving?: string | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsDateString({ strict: true })
  dateOfBirth?: string | null;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  experience?: number | null;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  salary?: number | null;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  phoneNumber?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  licenseNumber?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  licenseToDrive?: string[];

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsDateString({ strict: true })
  licenseIssueDate?: string | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsDateString({ strict: true })
  licenseExpiryDate?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  lifeInsuranceNumber?: string | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsDateString({ strict: true })
  lifeInsuranceExpiryDate?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  mediclaimNumber?: string | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsDateString({ strict: true })
  mediclaimExpiryDate?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  bloodGroup?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  supervisorName?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  supervisorPhoneNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(trimString)
  address?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DriverDocumentDto)
  documents?: DriverDocumentDto[];

  @IsOptional()
  @IsBoolean()
  licenseAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  licenseVerified?: boolean;

  @IsOptional()
  @IsBoolean()
  enableGeoVerifiedAttendance?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  geofences?: string[];

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status | null;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  reason?: string | null;
}

export class CreateDriverDetailDto extends DriverDetailFields {
  @IsString()
  @IsNotEmpty({ message: "client is required" })
  @Transform(trimString)
  client!: string;

  @IsString()
  @IsNotEmpty({ message: "firstName is required" })
  @MaxLength(255)
  @Transform(trimString)
  declare firstName: string;

  @IsString()
  @IsNotEmpty({ message: "lastName is required" })
  @MaxLength(255)
  @Transform(trimString)
  declare lastName: string;
}

export class UpdateDriverDetailDto extends DriverDetailFields {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "client cannot be empty" })
  @Transform(trimString)
  client?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(trimString)
  declare firstName?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(trimString)
  declare lastName?: string;
}
