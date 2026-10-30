import { container } from "tsyringe";
import { IVehicleDetailRepository } from "../../../domain/repositories/mysql/IVehicleDetailRepository";
import { VehicleDetailRepository } from "../../persistence/repositories/mysql/VehicleDetailRepository";
import { IVehicleDetailService } from "../../../services/interfaces/IVehicleDetailService";
import { VehicleDetailService } from "../../../services/VehicleDetailService";

export function registerVehicleDetailDependencies() {
  container.register<IVehicleDetailRepository>(
    "IVehicleDetailRepository",
    VehicleDetailRepository,
  );
  container.register<IVehicleDetailService>(
    "IVehicleDetailService",
    VehicleDetailService,
  );
}
