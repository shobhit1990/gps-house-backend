import { IsArray, IsOptional, IsString } from "class-validator";

export class FormError {
  @IsString()
  field!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsArray()
  children?: FormError[];
}
