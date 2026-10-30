import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateAddInventoryDto,
  UpdateAddInventoryDto,
} from "../domain/dto/AddInventoryDto";
import { FormError } from "../domain/dto/FormError";
import { AddInventory } from "../domain/entities/mysql/AddInventory";
import { Client } from "../domain/entities/mysql/Client";
import { DeviceType } from "../domain/entities/mysql/DeviceType";
import { Technician } from "../domain/entities/mysql/Technician";
import { AssignType } from "../domain/enums/AssignType";
import { Status } from "../domain/enums/status";
import { IAddInventoryRepository } from "../domain/repositories/mysql/IAddInventoryRepository";
import { AppError } from "../utils/errors";
import {
  AddInventoryResponse,
  IAddInventoryService,
} from "./interfaces/IAddInventoryService";

@injectable()
export class AddInventoryService implements IAddInventoryService {
  constructor(
    @inject("IAddInventoryRepository")
    private readonly inventoryRepository: IAddInventoryRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getAddInventories(): Promise<AddInventoryResponse[]> {
    const inventories = await this.inventoryRepository.getAddInventories();
    return inventories.map((inventory) => this.toResponse(inventory));
  }

  async getAddInventoryById(externalId: string): Promise<AddInventoryResponse> {
    const inventory =
      await this.inventoryRepository.getAddInventoryById(externalId);
    if (!inventory) {
      throw new AppError("Inventory not found", 404);
    }
    return this.toResponse(inventory);
  }

  async createAddInventory(
    payload: CreateAddInventoryDto,
    actorUserId?: number,
  ): Promise<AddInventoryResponse> {
    const em = this.em.fork();
    const deviceType = await em.findOne(DeviceType, {
      externalId: payload.deviceType,
      isDeleted: false,
    });
    if (!deviceType) {
      throw new AppError("Device type not found", 404);
    }
    const actor = await this.findActor(actorUserId);
    const assignment = await this.resolveAssignment(
      payload.assignType,
      payload.client,
      payload.technician,
    );

    const inventory = new AddInventory();
    inventory.inventoryType = payload.inventoryType;
    inventory.imei = payload.imei;
    inventory.simNumber = payload.simNumber;
    inventory.simOperator = payload.simOperator;
    inventory.secondarySimNumber = payload.secondarySimNumber;
    inventory.secondarySimOperator = payload.secondarySimOperator;
    inventory.deviceType = deviceType;
    inventory.assignType = payload.assignType;
    inventory.client = assignment.client;
    inventory.technician = assignment.technician;
    inventory.password = payload.password;
    inventory.ignitionWireConnected = payload.ignitionWireConnected ?? false;
    inventory.airConditionWireConnected =
      payload.airConditionWireConnected ?? false;
    inventory.analogSensor = payload.analogSensor ?? false;
    inventory.status = payload.status ?? undefined;
    inventory.reason = payload.reason ?? undefined;
    inventory.createdBy = actor;

    return this.toResponse(
      await this.inventoryRepository.createAddInventory(inventory),
    );
  }

  async updateAddInventory(
    externalId: string,
    payload: UpdateAddInventoryDto,
    actorUserId?: number,
  ): Promise<AddInventoryResponse> {
    const inventory =
      await this.inventoryRepository.getAddInventoryById(externalId);
    if (!inventory) {
      throw new AppError("Inventory not found", 404);
    }

    const em = this.em.fork();
    const deviceType = payload.deviceType
      ? await em.findOne(DeviceType, {
          externalId: payload.deviceType,
          isDeleted: false,
        })
      : inventory.deviceType;
    if (!deviceType) {
      throw new AppError("Device type not found", 404);
    }

    const actor = await this.findActor(actorUserId);
    if (actor) inventory.updatedBy = actor;
    const assignType = payload.assignType ?? inventory.assignType;
    const assignmentChanged =
      payload.assignType !== undefined &&
      payload.assignType !== inventory.assignType;
    const assignment =
      payload.assignType !== undefined ||
      payload.client !== undefined ||
      payload.technician !== undefined
        ? await this.resolveAssignment(
            assignType,
            payload.client ??
              (!assignmentChanged ? inventory.client?.externalId : undefined),
            payload.technician ??
              (!assignmentChanged
                ? inventory.technician?.externalId
                : undefined),
          )
        : {
            client: inventory.client,
            technician: inventory.technician,
          };
    if (payload.inventoryType !== undefined) {
      inventory.inventoryType = payload.inventoryType;
    }
    if (payload.imei !== undefined) inventory.imei = payload.imei;
    if (payload.simNumber !== undefined) {
      inventory.simNumber = payload.simNumber;
    }
    if (payload.simOperator !== undefined) {
      inventory.simOperator = payload.simOperator;
    }
    if (payload.secondarySimNumber !== undefined) {
      inventory.secondarySimNumber = payload.secondarySimNumber;
    }
    if (payload.secondarySimOperator !== undefined) {
      inventory.secondarySimOperator = payload.secondarySimOperator;
    }
    inventory.deviceType = deviceType;
    inventory.assignType = assignType;
    inventory.client = assignment.client;
    inventory.technician = assignment.technician;
    if (payload.password !== undefined) {
      inventory.password = payload.password;
    }
    if (payload.ignitionWireConnected !== undefined) {
      inventory.ignitionWireConnected = payload.ignitionWireConnected;
    }
    if (payload.airConditionWireConnected !== undefined) {
      inventory.airConditionWireConnected = payload.airConditionWireConnected;
    }
    if (payload.analogSensor !== undefined) {
      inventory.analogSensor = payload.analogSensor;
    }
    if (payload.status !== undefined) inventory.status = payload.status;
    if (payload.reason !== undefined) inventory.reason = payload.reason;

    return this.toResponse(
      await this.inventoryRepository.updateAddInventory(inventory),
    );
  }

  async deleteAddInventory(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.inventoryRepository.deleteAddInventory(externalId, actor);
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

  private async resolveAssignment(
    assignType: AssignType,
    clientId?: string,
    technicianId?: string,
  ): Promise<{ client?: Client; technician?: Technician }> {
    const errors: FormError[] = [];
    if (assignType === AssignType.CLIENT) {
      if (!clientId) {
        errors.push(this.assignmentError("client", "Client is required"));
      }
      if (technicianId) {
        errors.push(
          this.assignmentError(
            "technician",
            "Technician is not allowed for client assignment",
          ),
        );
      }
    } else {
      if (!technicianId) {
        errors.push(
          this.assignmentError("technician", "Technician is required"),
        );
      }
      if (clientId) {
        errors.push(
          this.assignmentError(
            "client",
            "Client is not allowed for technician assignment",
          ),
        );
      }
    }

    if (errors.length) {
      throw new AppError(
        "Validation failed. Please check the errors and try again.",
        400,
        null,
        errors,
      );
    }

    const em = this.em.fork();
    if (assignType === AssignType.CLIENT) {
      if (!clientId) {
        throw new AppError("Client is required", 400);
      }
      const client = await em.findOne(Client, {
        externalId: clientId,
        isDeleted: false,
      });
      if (!client) {
        throw new AppError("Client not found", 404);
      }
      return { client };
    }

    if (!technicianId) {
      throw new AppError("Technician is required", 400);
    }
    const technician = await em.findOne(Technician, {
      externalId: technicianId,
      isDeleted: false,
    });
    if (!technician) {
      throw new AppError("Technician not found", 404);
    }
    return { technician };
  }

  private assignmentError(field: string, message: string): FormError {
    const error = new FormError();
    error.field = field;
    error.message = message;
    return error;
  }

  private toResponse(inventory: AddInventory): AddInventoryResponse {
    return {
      id: inventory.externalId,
      inventoryType: inventory.inventoryType,
      imei: inventory.imei ?? null,
      simNumber: inventory.simNumber ?? null,
      simOperator: inventory.simOperator,
      secondarySimNumber: inventory.secondarySimNumber ?? null,
      secondarySimOperator: inventory.secondarySimOperator ?? null,
      deviceType: {
        id: inventory.deviceType.externalId,
        deviceName: inventory.deviceType.deviceName,
      },
      assignType: inventory.assignType,
      client: inventory.client
        ? {
            id: inventory.client.externalId,
            name: inventory.client.name ?? null,
            companyName: inventory.client.companyName,
          }
        : null,
      technician: inventory.technician
        ? {
            id: inventory.technician.externalId,
            name: inventory.technician.name ?? null,
            companyName: inventory.technician.companyName,
          }
        : null,
      ignitionWireConnected: inventory.ignitionWireConnected,
      airConditionWireConnected: inventory.airConditionWireConnected,
      analogSensor: inventory.analogSensor,
      status: inventory.status ?? null,
      reason: inventory.reason ?? null,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
    };
  }
}
