import { container } from "tsyringe";
import { IAddVehicleRepository } from "../../../domain/repositories/mysql/IAddVehicleRepository";
import { AddVehicleRepository } from "../../persistence/repositories/mysql/AddVehicleRepository";
import { IAddVehicleService } from "../../../services/interfaces/IAddVehicleService";
import { AddVehicleService } from "../../../services/AddVehicleService";

export function registerAddVehicleDependencies() {
    container.register<IAddVehicleRepository>(
        "IAddVehicleRepository",
        AddVehicleRepository,
    );
    container.register<IAddVehicleService>(
        "IAddVehicleService",
        AddVehicleService,
    );
}
