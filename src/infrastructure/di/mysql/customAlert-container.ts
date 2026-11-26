import { container } from "tsyringe";
import { ICustomAlertRepository } from "../../../domain/repositories/mysql/ICustomAlertRepository";
import { CustomAlertRepository } from "../../persistence/repositories/mysql/CustomAlertRepository";
import { ICustomAlertService } from "../../../services/interfaces/ICustomAlertService";
import { CustomAlertService } from "../../../services/CustomAlertService";

export function registerCustomAlertDependencies() {
  container.register<ICustomAlertRepository>(
    "ICustomAlertRepository",
    CustomAlertRepository,
  );
  container.register<ICustomAlertService>(
    "ICustomAlertService",
    CustomAlertService,
  );
}
