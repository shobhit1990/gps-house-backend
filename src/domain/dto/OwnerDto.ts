import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsOptional,

} from "class-validator";
import { Status } from "../enums/status";


export class CreateOwnerDto {

    @IsNotEmpty({ message: "name is required" })
    @IsString({ message: "name must be a string" })
    ownerName?: string;
}

export class UpdateOwnerDto {

    @IsOptional()
    @IsString({ message: "name must be a string" })
    ownerName?: string;

    @IsOptional()
    @IsEnum(Status)
    status!: Status

    @IsOptional()
    @IsString({ message: "Reason must be a string" })
    reason?: string
}