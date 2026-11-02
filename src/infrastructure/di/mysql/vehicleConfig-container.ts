import { container } from "tsyringe";
import { IVehicleConfigRepository } from "../../../domain/repositories/mysql/IVehicleConfigRepository";
import { VehicleConfigRepository } from "../../persistence/repositories/mysql/VehicleConfigRepository";
import { IVehicleConfigService } from "../../../services/interfaces/IVehicleConfigService";
import { VehicleConfigService } from "../../../services/VehicleConfigService";

export function registerVehicleConfigDependencies() {
  container.register<IVehicleConfigRepository>(
    "IVehicleConfigRepository",
    VehicleConfigRepository,
  );
  container.register<IVehicleConfigService>(
    "IVehicleConfigService",
    VehicleConfigService,
  );
}
