import { Expose } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateTimeZoneDto {
  @Expose()
  @IsNotEmpty({ message: "Language name is required" })
  @IsString({ message: "State name must be a string" })
  timeZone!: string;
}

export class UpdateTimeZoneDto {
    
  @Expose()
  @IsOptional()
  @IsString({ message: "State name must be a string" })
  timeZone!: string;
}