import { container } from "tsyringe";
import { IGeofenceRepository } from "../../../domain/repositories/mysql/IGeofenceRepository";
import { IGeofenceService } from "../../../services/interfaces/IGeofenceService";
import { GeofenceRepository } from "../../persistence/repositories/mysql/GeofenceRepository";
import { GeofenceService } from "../../../services/GeofenceService";

export function registerGeofenceDependencies() {
  container.register<IGeofenceRepository>(
    "IGeofenceRepository",
    GeofenceRepository,
  );
  container.register<IGeofenceService>("IGeofenceService", GeofenceService);
}
