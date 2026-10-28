import { container } from "tsyringe";
import { ITechnicianRepository } from "../../../domain/repositories/mysql/ITechnicianRepository";
import { TechnicianRepository } from "../../persistence/repositories/mysql/TechnicianRepository";
import { ITechnicianService } from "../../../services/interfaces/ITechnicianService";
import { TechnicianService } from "../../../services/TechnicianService";

export function registerTechnicianDependencies() {
  container.register<ITechnicianRepository>(
    "ITechnicianRepository",
    TechnicianRepository,
  );
  container.register<ITechnicianService>(
    "ITechnicianService",
    TechnicianService,
  );
}
