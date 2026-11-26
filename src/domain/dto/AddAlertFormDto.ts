import { Transform } from "class-transformer";
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import {
  AddAlertType,
  includesAlertType,
} from "../enums/AddAlertType";
import { Status } from "../enums/status";

const enumMessage = (name: string, values: object) =>
  `${name} must be one of: ${Object.values(values).join(", ")}`;

const trimString = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

const booleanFromForm = ({ value }: { value: unknown }) => {
  if (value === "true" || value === "1" || value === "on") return true;
  if (value === "false" || value === "0") return false;
  return value;
};

const numberFromForm = ({ value }: { value: unknown }) => {
  if (value === "" || value === undefined || value === null) return value;
  return typeof value === "number" ? value : Number(value);
};

export class CreateAddAlertDto {
  @IsArray()
  @ArrayNotEmpty({ message: "alertTypes is required" })
  @ArrayUnique({ message: "alertTypes must not contain duplicates" })
  @IsEnum(AddAlertType, {
    each: true,
    message: enumMessage("alertTypes", AddAlertType),
  })
  alertTypes!: AddAlertType[];

  @ValidateIf((dto) =>
    includesAlertType(dto.alertTypes, AddAlertType.OVER_DRIVE_DAILY_DISTANCE),
  )
  @Transform(numberFromForm)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "overDriveDailyDistance must be a number (km)" },
  )
  @Min(0, { message: "overDriveDailyDistance must be >= 0" })
  @IsNotEmpty({
    message:
      "overDriveDailyDistance is required when Over Drive Daily Distance is selected",
  })
  overDriveDailyDistance?: number;

  @ValidateIf((dto) =>
    includesAlertType(dto.alertTypes, AddAlertType.OVER_DRIVE_WEEKLY_DISTANCE),
  )
  @Transform(numberFromForm)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "overDriveWeeklyDistance must be a number (km)" },
  )
  @Min(0, { message: "overDriveWeeklyDistance must be >= 0" })
  @IsNotEmpty({
    message:
      "overDriveWeeklyDistance is required when Over Drive Weekly Distance is selected",
  })
  overDriveWeeklyDistance?: number;

  @ValidateIf((dto) =>
    includesAlertType(dto.alertTypes, AddAlertType.UNDER_DRIVE_DAILY_DISTANCE),
  )
  @Transform(numberFromForm)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "underDriveDailyDistance must be a number (km)" },
  )
  @Min(0, { message: "underDriveDailyDistance must be >= 0" })
  @IsNotEmpty({
    message:
      "underDriveDailyDistance is required when Under Drive Daily Distance is selected",
  })
  underDriveDailyDistance?: number;

  @ValidateIf((dto) =>
    includesAlertType(
      dto.alertTypes,
      AddAlertType.UNDER_DRIVE_WEEKLY_DISTANCE,
    ),
  )
  @Transform(numberFromForm)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "underDriveWeeklyDistance must be a number (km)" },
  )
  @Min(0, { message: "underDriveWeeklyDistance must be >= 0" })
  @IsNotEmpty({
    message:
      "underDriveWeeklyDistance is required when Under Drive Weekly Distance is selected",
  })
  underDriveWeeklyDistance?: number;

  @IsOptional()
  @Transform(booleanFromForm)
  @IsBoolean()
  mobile?: boolean;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trimString)
  reason?: string | null;
}

export class UpdateAddAlertDto {
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: "alertTypes cannot be empty" })
  @ArrayUnique({ message: "alertTypes must not contain duplicates" })
  @IsEnum(AddAlertType, {
    each: true,
    message: enumMessage("alertTypes", AddAlertType),
  })
  alertTypes?: AddAlertType[];

  @IsOptional()
  @Transform(numberFromForm)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "overDriveDailyDistance must be a number (km)" },
  )
  @Min(0, { message: "overDriveDailyDistance must be >= 0" })
  overDriveDailyDistance?: number | null;

  @IsOptional()
  @Transform(numberFromForm)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "overDriveWeeklyDistance must be a number (km)" },
  )
  @Min(0, { message: "overDriveWeeklyDistance must be >= 0" })
  overDriveWeeklyDistance?: number | null;

  @IsOptional()
  @Transform(numberFromForm)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "underDriveDailyDistance must be a number (km)" },
  )
  @Min(0, { message: "underDriveDailyDistance must be >= 0" })
  underDriveDailyDistance?: number | null;

  @IsOptional()
  @Transform(numberFromForm)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "underDriveWeeklyDistance must be a number (km)" },
  )
  @Min(0, { message: "underDriveWeeklyDistance must be >= 0" })
  underDriveWeeklyDistance?: number | null;

  @IsOptional()
  @Transform(booleanFromForm)
  @IsBoolean()
  mobile?: boolean;

  @IsOptional()
  @IsEnum(Status, { message: enumMessage("status", Status) })
  status?: Status;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trimString)
  reason?: string | null;
}
