import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { Status } from "../enums/status";

const STATUS_ENUM_MESSAGE = `Status must be one of: ${Object.values(Status).join(", ")}`;

export class UploadDocumentDto {
  @IsString({ message: "Document name must be a string" })
  @IsNotEmpty({ message: "Document name is required" })
  @MaxLength(255)
  documentName!: string;

  @IsArray()
  @ArrayMinSize(1, { message: "At least one document must be uploaded" })
  @IsString({ each: true })
  uploadDocument!: string[];

  @IsOptional()
  @IsEnum(Status, { message: STATUS_ENUM_MESSAGE })
  status?: Status;

  @IsOptional()
  @IsString({ message: "Reason must be a string" })
  reason?: string;
}

export class UpdateUploadDocumentDto {
  @IsOptional()
  @IsString({ message: "Document name must be a string" })
  @IsNotEmpty({ message: "Document name cannot be empty" })
  @MaxLength(255)
  documentName?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMinSize(1, { message: "At least one document must be uploaded" })
  @IsString({ each: true })
  uploadDocument?: string[];

  @IsOptional()
  @IsEnum(Status, { message: STATUS_ENUM_MESSAGE })
  status?: Status;

  @IsOptional()
  @IsString({ message: "Reason must be a string" })
  reason?: string;
}
