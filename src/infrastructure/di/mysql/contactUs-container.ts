import { container } from "tsyringe";
import { IContactUsRepository } from "../../../domain/repositories/mysql/IContactUsRepository";
import { ContactUsRepository } from "../../persistence/repositories/mysql/ContactUsRepository";
import { IContactUsService } from "../../../services/interfaces/IContactUsService";
import { ContactUsService } from "../../../services/ContactUsService";

export function registerContactUsDependencies() {
  container.register<IContactUsRepository>(
    "IContactUsRepository",
    ContactUsRepository,
  );
  container.register<IContactUsService>("IContactUsService", ContactUsService);
}
