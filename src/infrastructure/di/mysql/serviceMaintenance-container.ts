import { container } from "tsyringe";
import { IServiceMaintenanceRepository } from "../../../domain/repositories/mysql/IServiceMaintenanceRepository";
import { IServiceMaintenanceService } from "../../../services/interfaces/IServiceMaintenanceService";
import { ServiceMaintenanceService } from "../../../services/ServiceMaintenanceService";
import { ServiceMaintenanceRepository } from "../../persistence/repositories/mysql/ServiceMaintenanceRepository";

export function registerServiceMaintenanceDependencies() {
  container.register<IServiceMaintenanceRepository>(
    "IServiceMaintenanceRepository",
    ServiceMaintenanceRepository,
  );
  container.register<IServiceMaintenanceService>(
    "IServiceMaintenanceService",
    ServiceMaintenanceService,
  );
}
