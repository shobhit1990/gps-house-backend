import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import { AnnounceMent } from "../enums/AnnounceMent";
import { messageType } from "../enums/MessageType";
import { Status } from "../enums/status";
import { Validity } from "../enums/Validity";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

const numberFromForm = ({ value }: { value: unknown }) =>
  value === "" || value === undefined ? value : Number(value);

const booleanFromForm = ({ value }: { value: unknown }) => {
  if (value === "true" || value === "1" || value === "on") return true;
  if (value === "false" || value === "0") return false;
  return value;
};

export class CreateAnnouncementDto {
  @IsEnum(AnnounceMent, {
    message: enumMessage("announcement", AnnounceMent),
  })
  announcement!: AnnounceMent;

  @IsUUID("all")
  @IsNotEmpty({ message: "client is required" })
  client!: string;

  @ValidateIf((dto) => dto.announcement === AnnounceMent.TRANSPORTER)
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsUUID("all")
  @IsNotEmpty({
    message: "transporter is required for transporter announcements",
  })
  transporter?: string;

  @IsEnum(Validity, { message: enumMessage("validityTime", Validity) })
  validityTime!: Validity;

  @Transform(numberFromForm)
  @IsInt()
  @Min(1)
  validityDuration!: number;

  @IsEnum(messageType, { message: enumMessage("messageType", messageType) })
  messageType!: messageType;

  @IsString()
  @IsNotEmpty({ message: "title is required" })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  title!: string;

  @ValidateIf((dto) => dto.messageType === messageType.TEXT)
  @IsString()
  @IsNotEmpty({ message: "body is required for text announcements" })
  @MaxLength(50000)
  body?: string;

  @IsOptional()
  @Transform(booleanFromForm)
  @IsBoolean()
  requestForDontShowAgainOption?: boolean;

  @IsOptional()
  @Transform(booleanFromForm)
  @IsBoolean()
  requestForProfileUpdate?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  reason?: string | null;
}

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsEnum(AnnounceMent, {
    message: enumMessage("announcement", AnnounceMent),
  })
  announcement?: AnnounceMent;

  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsUUID("all")
  client?: string;

  @IsOptional()
  @IsUUID("all")
  transporter?: string;

  @IsOptional()
  @IsEnum(Validity, { message: enumMessage("validityTime", Validity) })
  validityTime?: Validity;

  @IsOptional()
  @Transform(numberFromForm)
  @IsInt()
  @Min(1)
  validityDuration?: number;

  @IsOptional()
  @IsEnum(messageType, { message: enumMessage("messageType", messageType) })
  messageType?: messageType;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "title cannot be empty" })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "body cannot be empty" })
  @MaxLength(50000)
  body?: string;

  @IsOptional()
  @Transform(booleanFromForm)
  @IsBoolean()
  requestForDontShowAgainOption?: boolean;

  @IsOptional()
  @Transform(booleanFromForm)
  @IsBoolean()
  requestForProfileUpdate?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  reason?: string | null;
}
