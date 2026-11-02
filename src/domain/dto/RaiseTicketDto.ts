import { Transform } from "class-transformer";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { Status } from "../enums/status";
import { TicketType } from "../enums/TicketType";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

const emptyToNull = ({ value }: { value: unknown }) =>
  value === "" ? null : value;

abstract class RaiseTicketFields {
  @IsOptional()
  @Transform(emptyToNull)
  @IsUUID("all")
  client?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsUUID("all")
  transporter?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsUUID("all")
  vehicle?: string | null;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  reason?: string | null;
}

export class CreateRaiseTicketDto extends RaiseTicketFields {
  @IsEnum(TicketType, { message: enumMessage("ticketType", TicketType) })
  ticketType!: TicketType;

  @IsString()
  @IsNotEmpty({ message: "description is required" })
  @MaxLength(10000)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  description!: string;
}

export class UpdateRaiseTicketDto extends RaiseTicketFields {
  @IsOptional()
  @IsEnum(TicketType, { message: enumMessage("ticketType", TicketType) })
  ticketType?: TicketType;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "description cannot be empty" })
  @MaxLength(10000)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  description?: string;
}
