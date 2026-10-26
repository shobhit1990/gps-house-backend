import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { MenuType } from "../enums/MenuType";
import { Status } from "../enums/status";

export class MenuItemUpdateDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  key?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  label?: string;

  @IsOptional()
  @IsBoolean()
  isTitle?: boolean;

  @IsOptional()
  @IsBoolean()
  showInMenu?: boolean;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsEnum(MenuType)
  menuType?: MenuType;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsBoolean()
  view?: boolean;

  @IsOptional()
  @IsBoolean()
  add?: boolean;

  @IsOptional()
  @IsBoolean()
  edit?: boolean;

  @IsOptional()
  @IsBoolean()
  delete?: boolean;

  @IsOptional()
  @IsBoolean()
  filter?: boolean;

  @IsOptional()
  @IsBoolean()
  print?: boolean;

  @IsOptional()
  @IsBoolean()
  excel?: boolean;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
