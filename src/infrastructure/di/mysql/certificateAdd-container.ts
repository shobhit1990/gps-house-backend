import { container } from "tsyringe";
import { ICertificateAddRepository } from "../../../domain/repositories/mysql/ICertificateAddRepository";
import { CertificateAddService } from "../../../services/CertificateAddService";
import { ICertificateAddService } from "../../../services/interfaces/ICertificateAddService";
import { CertificateAddRepository } from "../../persistence/repositories/mysql/CertificateAddRepository";

export function registerCertificateAddDependencies() {
  container.register<ICertificateAddRepository>(
    "ICertificateAddRepository",
    CertificateAddRepository,
  );
  container.register<ICertificateAddService>(
    "ICertificateAddService",
    CertificateAddService,
  );
}
