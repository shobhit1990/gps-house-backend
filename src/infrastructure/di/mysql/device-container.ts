import { container } from "tsyringe";
import { IDeviceRepository } from "../../../domain/repositories/mysql/IDeviceRepository";
import { IDeviceService } from "../../../services/interfaces/IDeviceService";
import { DeviceRepository } from "../../persistence/repositories/mysql/DeviceRepository";
import { DeviceService } from "../../../services/DeviceService";

export function registerDeviceDependencies() {
  container.register<IDeviceRepository>("IDeviceRepository", DeviceRepository);
  container.register<IDeviceService>("IDeviceService", DeviceService);
}
