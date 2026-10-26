import { CreateAddVehicleDto, UpdateAddVehicleDto } from "../../domain/dto/AddVehicleDto";
import { AddVehicle } from "../../domain/entities/mysql/AddVehicle";

export type AddVehicleResponse = Record<string, unknown>;

export interface IAddVehicleService {

    getAddVehicle(): Promise<AddVehicleResponse[]>;

    getAddVehicleById(externalId: string): Promise<AddVehicleResponse>;

    createAddVehicle(payload: CreateAddVehicleDto): Promise<AddVehicleResponse>;

    updateAddVehicle(externalId: string, payload: UpdateAddVehicleDto): Promise<AddVehicleResponse>;
    
    deleteAddVehicle(externalId: string): Promise<void>;
}