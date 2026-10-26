import { container } from "tsyringe";
import { ITransporterRepository } from "../../../domain/repositories/mysql/ITranporterRepository";
import { TransporterRepository } from "../../persistence/repositories/mysql/TransporterRepository";
import { ITransporterService } from "../../../services/interfaces/ITransporterService";
import { TransporterService } from "../../../services/TransporterService";

export function registerTransporterDependencies() {
  container.register<ITransporterRepository>(
    "ITransporterRepository",
    TransporterRepository
  );

  container.register<ITransporterService>(
    "ITransporterService",
    TransporterService
  );
}