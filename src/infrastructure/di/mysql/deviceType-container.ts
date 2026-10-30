import { container } from "tsyringe";
import { IDeviceTypeRepository } from "../../../domain/repositories/mysql/IDeviceTypeRepository";
import { DeviceTypeRepository } from "../../persistence/repositories/mysql/DeviceTypeRepository";
import { IDeviceTypeService } from "../../../services/interfaces/IDeviceTypeService";
import { DeviceTypeService } from "../../../services/DeviceTypeService";

export function registerDeviceTypeDependencies() {
  container.register<IDeviceTypeRepository>(
    "IDeviceTypeRepository",
    DeviceTypeRepository,
  );
  container.register<IDeviceTypeService>(
    "IDeviceTypeService",
    DeviceTypeService,
  );
}
