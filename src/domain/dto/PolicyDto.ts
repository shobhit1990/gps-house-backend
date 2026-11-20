import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { Status } from "../enums/status";

export class CreatePolicyDto {
  @IsString()
  @IsNotEmpty({ message: "body is required" })
  body!: string;
}

export class UpdatePolicyDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty({ message: "body cannot be empty" })
  body?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
