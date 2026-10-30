import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { AddInventory } from "../../../../domain/entities/mysql/AddInventory";
import { Client } from "../../../../domain/entities/mysql/Client";
import { Device } from "../../../../domain/entities/mysql/Device";
import { DeviceType } from "../../../../domain/entities/mysql/DeviceType";
import { AssignType } from "../../../../domain/enums/AssignType";
import { IDeviceRepository } from "../../../../domain/repositories/mysql/IDeviceRepository";
import { AppError } from "../../../../utils/errors";

const populate = ["deviceType", "client"] as const;

@injectable()
export class DeviceRepository implements IDeviceRepository {
  constructor(private readonly em: EntityManager) {}

  async getDevices(): Promise<Device[]> {
    return this.em
      .fork()
      .find(
        Device,
        { isDeleted: false },
        { populate: [...populate]},
      );
  }

  async getDeviceById(externalId: string): Promise<Device | null> {
    return this.em
      .fork()
      .findOne(
        Device,
        { externalId, isDeleted: false },
        { populate: [...populate] },
      );
  }

  async getDeviceByImei(imei: string): Promise<Device | null> {
    return this.em.fork().findOne(Device, { imei });
  }

  async getAvailableInventories(): Promise<AddInventory[]> {
    const em = this.em.fork();
    const inventories = await em.find(
      AddInventory,
      {
        assignType: AssignType.CLIENT,
        isDeleted: false,
        imei: { $ne: null },
      },
      { populate: ["deviceType", "client"] },
    );
    if (!inventories.length) return [];

    const registered = await em.find(Device, {
      imei: { $in: inventories.map((inventory) => inventory.imei!) },
    });
    const registeredImeis = new Set(registered.map((device) => device.imei));
    return inventories.filter(
      (inventory) => inventory.imei && !registeredImeis.has(inventory.imei),
    );
  }

  async getAvailableInventoryByImei(
    imei: string,
  ): Promise<AddInventory | null> {
    const em = this.em.fork();
    const inventory = await em.findOne(
      AddInventory,
      {
        imei,
        assignType: AssignType.CLIENT,
        isDeleted: false,
      },
      { populate: ["deviceType", "client"] },
    );
    if (!inventory) return null;

    const device = await em.findOne(Device, { imei });
    return device ? null : inventory;
  }

  async createDevice(device: Device): Promise<Device> {
    const em = this.em.fork();
    device.deviceType = em.getReference(DeviceType, device.deviceType.id);
    device.client = em.getReference(Client, device.client.id);
    if (device.createdBy) {
      device.createdBy = em.getReference(Client, device.createdBy.id);
    }

    try {
      await em.persistAndFlush(device);
    } catch (error: unknown) {
      this.throwDuplicateImeiError(error);
    }
    await em.populate(device, [...populate]);
    return device;
  }

  async updateDevice(device: Device): Promise<Device> {
    const em = this.em.fork();
    const existing = await em.findOne(
      Device,
      { externalId: device.externalId, isDeleted: false },
      { populate: [...populate] },
    );
    if (!existing) {
      throw new AppError("Device not found", 404);
    }

    em.assign(existing, {
      imei: device.imei,
      simNumber: device.simNumber,
      simOperator: device.simOperator,
      secondarySimNumber: device.secondarySimNumber,
      secondarySimOperator: device.secondarySimOperator,
      deviceType: em.getReference(DeviceType, device.deviceType.id),
      client: em.getReference(Client, device.client.id),
      password: device.password,
      status: device.status,
      reason: device.reason,
      ignitionWireConnected: device.ignitionWireConnected,
      ignitionWireNotConnected: device.ignitionWireNotConnected,
      airConditionWireConnected: device.airConditionWireConnected,
      attendance: device.attendance,
      timezoneSetting: device.timezoneSetting,
      ...(device.updatedBy
        ? { updatedBy: em.getReference(Client, device.updatedBy.id) }
        : {}),
      updatedAt: new Date(),
    });
    try {
      await em.flush();
    } catch (error: unknown) {
      this.throwDuplicateImeiError(error);
    }
    await em.populate(existing, [...populate]);
    return existing;
  }

  async deleteDevice(externalId: string, deletedBy?: Client): Promise<void> {
    const em = this.em.fork();
    const device = await em.findOne(Device, { externalId, isDeleted: false });
    if (!device) {
      throw new AppError("Device not found", 404);
    }

    const now = new Date();
    device.isDeleted = true;
    device.deletedAt = now;
    device.updatedAt = now;
    if (deletedBy) {
      device.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }

  private throwDuplicateImeiError(error: unknown): never {
    const current = error as {
      code?: string;
      errno?: number;
      message?: string;
      sqlMessage?: string;
    };
    const text = [current.sqlMessage, current.message]
      .filter(Boolean)
      .join(" ");
    const isDuplicate =
      current.code === "ER_DUP_ENTRY" ||
      current.errno === 1062 ||
      /duplicate entry/i.test(text);
    if (isDuplicate && /imei/i.test(text)) {
      throw new AppError("IMEI is already registered", 409);
    }
    throw error;
  }
}
