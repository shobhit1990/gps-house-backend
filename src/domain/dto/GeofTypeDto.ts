import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsOptional,

} from "class-validator";
import { Status } from "../enums/status";


export class CreatGeofTypeDto {

    @IsNotEmpty({ message: "Geof Type is required" })
    @IsString({ message: "Geof Type must be a string" })
    geofType?: string;
}

export class UpdateGeofTypeDto {

    @IsOptional()
    @IsString({ message: "name must be a string" })
    geofType?: string;

    @IsOptional()
    @IsEnum(Status)
    status?: Status

    @IsOptional()
    @IsString({ message: "Reason must be a string" })
    reason?: string
}