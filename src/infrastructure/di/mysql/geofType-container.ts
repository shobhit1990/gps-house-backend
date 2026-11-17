import { container } from "tsyringe";
import { IGeofTypeRepository } from "../../../domain/repositories/mysql/IGeofTypeRepository";
import { GeofTypeRepository } from "../../persistence/repositories/mysql/GeofTypeRepository";
import { IGeofTypeService } from "../../../services/interfaces/IGeofTypeService";
import { GeofTypeService } from "../../../services/GeofTypeService";

export function registerGeofTypeDependencies() {
  container.register<IGeofTypeRepository>(
    "IGeofTypeRepository",
    GeofTypeRepository,
  );
  container.register<IGeofTypeService>(
    "IGeofTypeService",
    GeofTypeService,
  );
}