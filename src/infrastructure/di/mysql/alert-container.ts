import { container } from "tsyringe";
import { IAlertRepository } from "../../../domain/repositories/mysql/IAlertRepository";
import { AlertRepository } from "../../persistence/repositories/mysql/AlertRepository";
import { IAlertService } from "../../../services/interfaces/IAlertService";
import { AlertService } from "../../../services/AlertService";

export function registerAlertDependencies() {
  container.register<IAlertRepository>("IAlertRepository", {
    useClass: AlertRepository,
  });
  container.register<IAlertService>("IAlertService", {
    useClass: AlertService,
  });
}