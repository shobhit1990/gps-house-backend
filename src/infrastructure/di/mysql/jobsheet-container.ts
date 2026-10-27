import { container } from "tsyringe";
import { IJobsheetRepository } from "../../../domain/repositories/mysql/IJobsheetRepository";
import { JobsheetRepository } from "../../persistence/repositories/mysql/JobsheetRepository";
import { IJobsheetService } from "../../../services/interfaces/IJobsheetService";
import { JobsheetService } from "../../../services/JobsheetService";

export function registerJobsheetDependencies() {
  container.register<IJobsheetRepository>(
    "IJobsheetRepository",
    JobsheetRepository,
  );
  container.register<IJobsheetService>("IJobsheetService", JobsheetService);
}
