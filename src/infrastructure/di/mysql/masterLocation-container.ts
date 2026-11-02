import { container } from "tsyringe";
import { IDistrictRepository } from "../../../domain/repositories/mysql/IDistrictRepository";
import { IStateRepository } from "../../../domain/repositories/mysql/IStateRepository";
import { MasterLocationService } from "../../../services/MasterLocationService";
import { IMasterLocationService } from "../../../services/interfaces/IMasterLocationService";
import { DistrictRepository } from "../../persistence/repositories/mysql/DistrictRepository";
import { StateRepository } from "../../persistence/repositories/mysql/StateRepository";

export function registerMasterLocationDependencies() {
  container.register<IStateRepository>("IStateRepository", StateRepository);
  container.register<IDistrictRepository>(
    "IDistrictRepository",
    DistrictRepository,
  );
  container.register<IMasterLocationService>(
    "IMasterLocationService",
    MasterLocationService,
  );
}
