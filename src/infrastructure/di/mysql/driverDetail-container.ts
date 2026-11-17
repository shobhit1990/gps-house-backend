import { container } from "tsyringe";
import { IDriverDetailRepository } from "../../../domain/repositories/mysql/IDriverDetailRepository";
import { IDriverDetailService } from "../../../services/interfaces/IDriverDetailService";
import { DriverDetailService } from "../../../services/DriverDetailService";
import { DriverDetailRepository } from "../../persistence/repositories/mysql/DriverDetailRepository";

export function registerDriverDetailDependencies() {
  container.register<IDriverDetailRepository>(
    "IDriverDetailRepository",
    DriverDetailRepository,
  );
  container.register<IDriverDetailService>(
    "IDriverDetailService",
    DriverDetailService,
  );
}
