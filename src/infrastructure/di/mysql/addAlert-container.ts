import { container } from "tsyringe";
import { IAddAlertRepository } from "../../../domain/repositories/mysql/IAddAlertRepository";
import { AddAlertRepository } from "../../persistence/repositories/mysql/AddAlertRepository";
import { IAddAlertService } from "../../../services/interfaces/IAddAlertService";
import { AddAlertService } from "../../../services/AddAlertService";

export function registerAddAlertDependencies() {
  container.register<IAddAlertRepository>(
    "IAddAlertRepository",
    AddAlertRepository,
  );
  container.register<IAddAlertService>("IAddAlertService", AddAlertService);
}
