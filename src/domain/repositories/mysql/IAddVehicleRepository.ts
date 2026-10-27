import { AddVehicle } from "../../entities/mysql/AddVehicle";

export interface IAddVehicleRepository {

    getAddVehicle(): Promise<AddVehicle[]>;

    getAddVehicleById(externalId: string): Promise<AddVehicle | null>;

    createAddVehicle(vehicle: AddVehicle): Promise<AddVehicle>;

    updateAddVehicle(vehicle: AddVehicle): Promise<AddVehicle>;
    
    deleteAddVehicle(externalId: string): Promise<void>;
}