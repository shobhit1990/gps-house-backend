
import { container } from "tsyringe";
import { IOwnerRepository } from "../../../domain/repositories/mysql/IOwnerRepository";
import { OwnerRepository } from "../../persistence/repositories/mysql/OwnerRepository";
import { IOwnerService } from "../../../services/interfaces/IOwnerService";
import { OwnerService } from "../../../services/OwnerService";

export function registerOwnerDependencies() {
  container.register<IOwnerRepository>(
    "IOwnerRepository",
    OwnerRepository
  );

  container.register<IOwnerService>(
    "IOwnerService",
    OwnerService
  );
}
