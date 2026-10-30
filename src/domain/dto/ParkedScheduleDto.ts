import { Transform } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";
import { Scheduled } from "../enums/Scheduled";
import { Status } from "../enums/status";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

const emptyToNull = ({ value }: { value: unknown }) =>
  value === "" ? null : value;

abstract class ParkedScheduleFields {
  @IsOptional()
  @Transform(emptyToNull)
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/, {
    message: "scheduledFrom must be in HH:mm format",
  })
  scheduledFrom?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/, {
    message: "scheduledTill must be in HH:mm format",
  })
  scheduledTill?: string;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  reason?: string | null;
}

export class CreateParkedScheduleDto extends ParkedScheduleFields {
  @IsUUID("all")
  @IsNotEmpty({ message: "client is required" })
  client!: string;

  @IsUUID("all")
  @IsNotEmpty({ message: "transporter is required" })
  transporter!: string;

  @IsUUID("all")
  @IsNotEmpty({ message: "vehicle is required" })
  vehicle!: string;

  @IsEnum(Scheduled, { message: enumMessage("scheduled", Scheduled) })
  scheduled!: Scheduled;

  @IsString()
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/, {
    message: "scheduledFrom is required in HH:mm format",
  })
  scheduledFrom!: string;

  @IsString()
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/, {
    message: "scheduledTill is required in HH:mm format",
  })
  scheduledTill!: string;
}

export class UpdateParkedScheduleDto extends ParkedScheduleFields {
  @IsOptional()
  @IsUUID("all")
  client?: string;

  @IsOptional()
  @IsUUID("all")
  transporter?: string;

  @IsOptional()
  @IsUUID("all")
  vehicle?: string;

  @IsOptional()
  @IsEnum(Scheduled, { message: enumMessage("scheduled", Scheduled) })
  scheduled?: Scheduled;
}
