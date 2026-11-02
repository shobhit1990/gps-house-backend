import { Transform } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";
import { AssignTo } from "../enums/AssignTo";
import { Status } from "../enums/status";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

abstract class TransferCoinFields {
  @IsOptional()
  @IsEnum(AssignTo, { message: enumMessage("assignTo", AssignTo) })
  assignTo?: AssignTo;

  @IsOptional()
  @IsUUID("all")
  client?: string;

  @IsOptional()
  @IsUUID("all")
  transporter?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  coins?: number;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  reason?: string | null;
}

export class CreateTransferCoinDto extends TransferCoinFields {
  @IsEnum(AssignTo, { message: enumMessage("assignTo", AssignTo) })
  declare assignTo: AssignTo;

  @IsInt()
  @Min(1)
  declare coins: number;
}

export class UpdateTransferCoinDto extends TransferCoinFields {}
