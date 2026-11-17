import { container } from "tsyringe";
import { ILicenseRepository } from "../../../domain/repositories/mysql/ILicenseRepository";
import { ILicenseService } from "../../../services/interfaces/ILicenseService";
import { LicenseService } from "../../../services/LicenseService";
import { LicenseRepository } from "../../persistence/repositories/mysql/LicenseRepository";

export function registerLicenseDependencies() {
  container.register<ILicenseRepository>(
    "ILicenseRepository",
    LicenseRepository,
  );
  container.register<ILicenseService>("ILicenseService", LicenseService);
}
