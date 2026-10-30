import { DeviceType } from "../../entities/mysql/DeviceType";
import { Client } from "../../entities/mysql/Client";

export interface IDeviceTypeRepository {
  getDeviceTypes(): Promise<DeviceType[]>;

  getDeviceTypeById(externalId: string): Promise<DeviceType | null>;

  createDeviceType(deviceType: DeviceType): Promise<DeviceType>;

  updateDeviceType(deviceType: DeviceType): Promise<DeviceType>;

  deleteDeviceType(externalId: string, deletedBy?: Client): Promise<void>;
}
