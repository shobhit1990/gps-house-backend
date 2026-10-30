import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { DeviceType } from "../../../../domain/entities/mysql/DeviceType";
import { Client } from "../../../../domain/entities/mysql/Client";
import { IDeviceTypeRepository } from "../../../../domain/repositories/mysql/IDeviceTypeRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class DeviceTypeRepository implements IDeviceTypeRepository {
  constructor(private readonly em: EntityManager) {}

  async getDeviceTypes(): Promise<DeviceType[]> {
    return this.em.fork().find(DeviceType, { isDeleted: false });
  }

  async getDeviceTypeById(externalId: string): Promise<DeviceType | null> {
    return this.em.fork().findOne(DeviceType, { externalId, isDeleted: false });
  }

  async createDeviceType(deviceType: DeviceType): Promise<DeviceType> {
    const em = this.em.fork();
    if (deviceType.createdBy) {
      deviceType.createdBy = em.getReference(Client, deviceType.createdBy.id);
    }
    await em.persistAndFlush(deviceType);
    return deviceType;
  }

  async updateDeviceType(deviceType: DeviceType): Promise<DeviceType> {
    const em = this.em.fork();
    const existing = await em.findOne(DeviceType, {
      externalId: deviceType.externalId,
      isDeleted: false,
    });

    if (!existing) {
      throw new AppError("Device type not found", 404);
    }

    em.assign(existing, {
      deviceName: deviceType.deviceName,
      status: deviceType.status,
      reason: deviceType.reason,
      ...(deviceType.updatedBy
        ? { updatedBy: em.getReference(Client, deviceType.updatedBy.id) }
        : {}),
      updatedAt: new Date(),
    });
    await em.flush();
    return existing;
  }

  async deleteDeviceType(
    externalId: string,
    deletedBy?: Client,
  ): Promise<void> {
    const em = this.em.fork();
    const deviceType = await em.findOne(DeviceType, {
      externalId,
      isDeleted: false,
    });

    if (!deviceType) {
      throw new AppError("Device type not found", 404);
    }

    const now = new Date();
    deviceType.isDeleted = true;
    deviceType.deletedAt = now;
    deviceType.updatedAt = now;
    if (deletedBy) {
      deviceType.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }
}
