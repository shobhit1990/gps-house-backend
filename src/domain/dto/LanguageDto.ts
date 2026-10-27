import { Expose } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateLanguageDto {
  @Expose()
  @IsNotEmpty({ message: "Language name is required" })
  @IsString({ message: "State name must be a string" })
  languageName!: string;
}

export class UpdateLanguageDto {
    
  @Expose()
  @IsOptional()
  @IsString({ message: "State name must be a string" })
  languageName!: string;
}