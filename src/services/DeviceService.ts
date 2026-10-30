import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import { CreateDeviceDto, UpdateDeviceDto } from "../domain/dto/DeviceDto";
import { AddInventory } from "../domain/entities/mysql/AddInventory";
import { Client } from "../domain/entities/mysql/Client";
import { Device } from "../domain/entities/mysql/Device";
import { DeviceType } from "../domain/entities/mysql/DeviceType";
import { Status } from "../domain/enums/status";
import { IDeviceRepository } from "../domain/repositories/mysql/IDeviceRepository";
import { AppError } from "../utils/errors";
import {
  DeviceInventoryResponse,
  DeviceResponse,
  IDeviceService,
} from "./interfaces/IDeviceService";

@injectable()
export class DeviceService implements IDeviceService {
  constructor(
    @inject("IDeviceRepository")
    private readonly deviceRepository: IDeviceRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getDevices(): Promise<DeviceResponse[]> {
    const devices = await this.deviceRepository.getDevices();
    return devices.map((device) => this.toResponse(device));
  }

  async getDeviceById(externalId: string): Promise<DeviceResponse> {
    const device = await this.deviceRepository.getDeviceById(externalId);
    if (!device) throw new AppError("Device not found", 404);
    return this.toResponse(device);
  }

  async getAvailableInventories(): Promise<DeviceInventoryResponse[]> {
    const inventories = await this.deviceRepository.getAvailableInventories();
    return inventories.map((inventory) => this.toInventoryResponse(inventory));
  }

  async getAvailableInventoryByImei(
    imei: string,
  ): Promise<DeviceInventoryResponse> {
    const inventory =
      await this.deviceRepository.getAvailableInventoryByImei(imei);
    if (!inventory) {
      throw new AppError("Available inventory item not found", 404);
    }
    return this.toInventoryResponse(inventory);
  }

  async createDevice(
    payload: CreateDeviceDto,
    actorUserId?: number,
  ): Promise<DeviceResponse> {
    const { client, deviceType } = await this.resolveRelations(
      payload.client,
      payload.deviceType,
    );
    if (await this.deviceRepository.getDeviceByImei(payload.imei)) {
      throw new AppError("IMEI is already registered", 409);
    }

    const device = new Device();
    device.imei = payload.imei;
    device.simNumber = payload.simNumber;
    device.simOperator = payload.simOperator;
    device.secondarySimNumber = payload.secondarySimNumber ?? undefined;
    device.secondarySimOperator = payload.secondarySimOperator ?? undefined;
    device.client = client;
    device.deviceType = deviceType;
    device.password = payload.password ?? undefined;
    device.status = payload.status ?? Status.ACTIVE;
    device.reason = payload.reason ?? undefined;
    device.ignitionWireConnected = payload.ignitionWireConnected ?? false;
    device.ignitionWireNotConnected = payload.ignitionWireNotConnected ?? false;
    device.airConditionWireConnected =
      payload.airConditionWireConnected ?? false;
    device.attendance = payload.attendance ?? false;
    device.timezoneSetting = payload.timezoneSetting ?? false;
    device.createdBy = await this.findActor(actorUserId);

    return this.toResponse(await this.deviceRepository.createDevice(device));
  }

  async updateDevice(
    externalId: string,
    payload: UpdateDeviceDto,
    actorUserId?: number,
  ): Promise<DeviceResponse> {
    const device = await this.deviceRepository.getDeviceById(externalId);
    if (!device) throw new AppError("Device not found", 404);

    const { client, deviceType } = await this.resolveRelations(
      payload.client ?? device.client.externalId,
      payload.deviceType ?? device.deviceType.externalId,
    );
    const imei = payload.imei ?? device.imei;
    const duplicate = await this.deviceRepository.getDeviceByImei(imei);
    if (duplicate && duplicate.externalId !== device.externalId) {
      throw new AppError("IMEI is already registered", 409);
    }

    device.imei = imei;
    if (payload.simNumber !== undefined) device.simNumber = payload.simNumber;
    if (payload.simOperator !== undefined) {
      device.simOperator = payload.simOperator;
    }
    if (payload.secondarySimNumber !== undefined) {
      device.secondarySimNumber = payload.secondarySimNumber ?? undefined;
    }
    if (payload.secondarySimOperator !== undefined) {
      device.secondarySimOperator = payload.secondarySimOperator ?? undefined;
    }
    device.client = client;
    device.deviceType = deviceType;
    if (payload.password !== undefined) {
      device.password = payload.password ?? undefined;
    }
    if (payload.status !== undefined) {
      device.status = payload.status ?? Status.ACTIVE;
    }
    if (payload.reason !== undefined) {
      device.reason = payload.reason ?? undefined;
    }
    if (payload.ignitionWireConnected !== undefined) {
      device.ignitionWireConnected = payload.ignitionWireConnected;
    }
    if (payload.ignitionWireNotConnected !== undefined) {
      device.ignitionWireNotConnected = payload.ignitionWireNotConnected;
    }
    if (payload.airConditionWireConnected !== undefined) {
      device.airConditionWireConnected = payload.airConditionWireConnected;
    }
    if (payload.attendance !== undefined) {
      device.attendance = payload.attendance;
    }
    if (payload.timezoneSetting !== undefined) {
      device.timezoneSetting = payload.timezoneSetting;
    }
    device.updatedBy = await this.findActor(actorUserId);

    return this.toResponse(await this.deviceRepository.updateDevice(device));
  }

  async deleteDevice(externalId: string, actorUserId?: number): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.deviceRepository.deleteDevice(externalId, actor);
  }

  private async resolveRelations(
    clientId: string,
    deviceTypeId: string,
  ): Promise<{ client: Client; deviceType: DeviceType }> {
    const em = this.em.fork();
    const [client, deviceType] = await Promise.all([
      em.findOne(Client, { externalId: clientId, isDeleted: false }),
      em.findOne(DeviceType, { externalId: deviceTypeId, isDeleted: false }),
    ]);
    if (!client) throw new AppError("Client not found", 404);
    if (!deviceType) throw new AppError("Device type not found", 404);
    return { client, deviceType };
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
    if (!actor) throw new AppError("User not found", 401);
    return actor;
  }

  private toResponse(device: Device): DeviceResponse {
    return {
      id: device.externalId,
      imei: device.imei,
      simNumber: device.simNumber,
      simOperator: device.simOperator,
      secondarySimNumber: device.secondarySimNumber ?? null,
      secondarySimOperator: device.secondarySimOperator ?? null,
      deviceType: {
        id: device.deviceType.externalId,
        deviceName: device.deviceType.deviceName,
      },
      client: {
        id: device.client.externalId,
        name: device.client.name ?? null,
        companyName: device.client.companyName,
      },
      status: device.status,
      reason: device.reason ?? null,
      ignitionWireConnected: device.ignitionWireConnected,
      ignitionWireNotConnected: device.ignitionWireNotConnected,
      airConditionWireConnected: device.airConditionWireConnected,
      attendance: device.attendance,
      timezoneSetting: device.timezoneSetting,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    };
  }

  private toInventoryResponse(
    inventory: AddInventory,
  ): DeviceInventoryResponse {
    return {
      id: inventory.externalId,
      imei: inventory.imei!,
      simNumber: inventory.simNumber ?? null,
      simOperator: inventory.simOperator,
      secondarySimNumber: inventory.secondarySimNumber ?? null,
      secondarySimOperator: inventory.secondarySimOperator ?? null,
      deviceType: {
        id: inventory.deviceType.externalId,
        deviceName: inventory.deviceType.deviceName,
      },
      client: inventory.client
        ? {
            id: inventory.client.externalId,
            name: inventory.client.name ?? null,
            companyName: inventory.client.companyName,
          }
        : null,
      ignitionWireConnected: inventory.ignitionWireConnected,
      airConditionWireConnected: inventory.airConditionWireConnected,
    };
  }
}
