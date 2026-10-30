import { AddInventory } from "../../entities/mysql/AddInventory";
import { Client } from "../../entities/mysql/Client";
import { Device } from "../../entities/mysql/Device";

export interface IDeviceRepository {
  getDevices(): Promise<Device[]>;

  getDeviceById(externalId: string): Promise<Device | null>;

  getDeviceByImei(imei: string): Promise<Device | null>;

  getAvailableInventories(): Promise<AddInventory[]>;

  getAvailableInventoryByImei(imei: string): Promise<AddInventory | null>;

  createDevice(device: Device): Promise<Device>;

  updateDevice(device: Device): Promise<Device>;

  deleteDevice(externalId: string, deletedBy?: Client): Promise<void>;
}
