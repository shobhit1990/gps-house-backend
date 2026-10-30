import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateDeviceTypeDto,
  UpdateDeviceTypeDto,
} from "../domain/dto/DeviceTypeDto";
import { DeviceType } from "../domain/entities/mysql/DeviceType";
import { Client } from "../domain/entities/mysql/Client";
import { Status } from "../domain/enums/status";
import { IDeviceTypeRepository } from "../domain/repositories/mysql/IDeviceTypeRepository";
import { AppError } from "../utils/errors";
import {
  DeviceTypeResponse,
  IDeviceTypeService,
} from "./interfaces/IDeviceTypeService";

@injectable()
export class DeviceTypeService implements IDeviceTypeService {
  constructor(
    @inject("IDeviceTypeRepository")
    private readonly deviceTypeRepository: IDeviceTypeRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getDeviceTypes(): Promise<DeviceTypeResponse[]> {
    const deviceTypes = await this.deviceTypeRepository.getDeviceTypes();
    return deviceTypes.map((deviceType) => this.toResponse(deviceType));
  }

  async getDeviceTypeById(externalId: string): Promise<DeviceTypeResponse> {
    const deviceType =
      await this.deviceTypeRepository.getDeviceTypeById(externalId);
    if (!deviceType) {
      throw new AppError("Device type not found", 404);
    }
    return this.toResponse(deviceType);
  }

  async createDeviceType(
    payload: CreateDeviceTypeDto,
    actorUserId?: number,
  ): Promise<DeviceTypeResponse> {
    const actor = await this.findActor(actorUserId);
    const deviceType = new DeviceType();
    deviceType.deviceName = payload.deviceName;
    deviceType.status = payload.status ?? Status.ACTIVE;
    deviceType.reason = payload.reason ?? undefined;
    deviceType.createdBy = actor;

    return this.toResponse(
      await this.deviceTypeRepository.createDeviceType(deviceType),
    );
  }

  async updateDeviceType(
    externalId: string,
    payload: UpdateDeviceTypeDto,
    actorUserId?: number,
  ): Promise<DeviceTypeResponse> {
    const deviceType =
      await this.deviceTypeRepository.getDeviceTypeById(externalId);
    if (!deviceType) {
      throw new AppError("Device type not found", 404);
    }

    const actor = await this.findActor(actorUserId);
    if (actor) deviceType.updatedBy = actor;
    if (payload.deviceName !== undefined) {
      deviceType.deviceName = payload.deviceName;
    }
    if (payload.status !== undefined) deviceType.status = payload.status;
    if (payload.reason !== undefined) {
      deviceType.reason = payload.reason ?? undefined;
    }

    return this.toResponse(
      await this.deviceTypeRepository.updateDeviceType(deviceType),
    );
  }

  async deleteDeviceType(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.deviceTypeRepository.deleteDeviceType(externalId, actor);
  }

  private async findActor(userId?: number): Promise<Client | undefined> {
    if (userId === undefined) return undefined;
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new AppError("Invalid user ID", 401);
    }

    const actor = await this.em.fork().findOne(Client, {
      id: userId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!actor) {
      throw new AppError("User not found", 401);
    }
    return actor;
  }

  private toResponse(deviceType: DeviceType): DeviceTypeResponse {
    return {
      id: deviceType.externalId,
      deviceName: deviceType.deviceName,
      createdBy: deviceType.createdBy?.id ?? null,
      updatedBy: deviceType.updatedBy?.id ?? null,
      deletedBy: deviceType.deletedBy?.id ?? null,
      status: deviceType.status,
      reason: deviceType.reason ?? null,
      createdAt: deviceType.createdAt,
      updatedAt: deviceType.updatedAt,
      deletedAt: deviceType.deletedAt ?? null,
    };
  }
}
