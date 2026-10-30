import { Expose } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateAlertDto {
  @Expose()
  @IsNotEmpty({ message: "Alert name is required" })
  @IsString({ message: "Alert name must be a string" })
  alertName!: string;
}

export class UpdateAlertDto {
    
  @Expose()
  @IsOptional()
  @IsString({ message: "Alert name must be a string" })
  alertName!: string;
}