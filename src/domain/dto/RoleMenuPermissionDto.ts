import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional, IsUUID } from "class-validator";
import { Status } from "../enums/status";

const STATUS_ENUM_MESSAGE = `Status must be one of: ${Object.values(Status).join(", ")}`;

export class UpdateRoleMenuPermissionDto {
  @IsOptional()
  @IsUUID("4", { message: "roleId must be a valid UUID" })
  roleId?: string;

  @IsOptional()
  @IsUUID("4", { message: "menuItemId must be a valid UUID" })
  menuItemId?: string;

  @IsOptional()
  @IsBoolean({ message: "view must be a boolean" })
  @Transform(({ value }) =>
    value === "true" ? true : value === "false" ? false : value,
  )
  view?: boolean;

  @IsOptional()
  @IsBoolean({ message: "add must be a boolean" })
  @Transform(({ value }) =>
    value === "true" ? true : value === "false" ? false : value,
  )
  add?: boolean;

  @IsOptional()
  @IsBoolean({ message: "edit must be a boolean" })
  @Transform(({ value }) =>
    value === "true" ? true : value === "false" ? false : value,
  )
  edit?: boolean;

  @IsOptional()
  @IsBoolean({ message: "delete must be a boolean" })
  @Transform(({ value }) =>
    value === "true" ? true : value === "false" ? false : value,
  )
  delete?: boolean;

  @IsOptional()
  @IsBoolean({ message: "filter must be a boolean" })
  @Transform(({ value }) =>
    value === "true" ? true : value === "false" ? false : value,
  )
  filter?: boolean;

  @IsOptional()
  @IsBoolean({ message: "print must be a boolean" })
  @Transform(({ value }) =>
    value === "true" ? true : value === "false" ? false : value,
  )
  print?: boolean;

  @IsOptional()
  @IsBoolean({ message: "excel must be a boolean" })
  @Transform(({ value }) =>
    value === "true" ? true : value === "false" ? false : value,
  )
  excel?: boolean;

  @IsOptional()
  @IsEnum(Status, { message: STATUS_ENUM_MESSAGE })
  status?: Status;
}
