import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateServiceMaintenanceDto,
  UpdateServiceMaintenanceDto,
} from "../domain/dto/ServiceMaintenanceDto";
import { ServiceMaintenance } from "../domain/entities/mysql/ServiceMaintenance";
import { AddVehicle } from "../domain/entities/mysql/AddVehicle";
import { Client } from "../domain/entities/mysql/Client";
import { Status } from "../domain/enums/status";
import { IServiceMaintenanceRepository } from "../domain/repositories/mysql/IServiceMaintenanceRepository";
import { AppError } from "../utils/errors";
import {
  IServiceMaintenanceService,
  ServiceMaintenanceResponse,
} from "./interfaces/IServiceMaintenanceService";

@injectable()
export class ServiceMaintenanceService implements IServiceMaintenanceService {
  constructor(
    @inject("IServiceMaintenanceRepository")
    private readonly serviceMaintenanceRepository: IServiceMaintenanceRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getServiceMaintenances(): Promise<ServiceMaintenanceResponse[]> {
    const details =
      await this.serviceMaintenanceRepository.getServiceMaintenances();
    return details.map((detail) => this.toResponse(detail));
  }

  async getServiceMaintenanceById(
    externalId: string,
  ): Promise<ServiceMaintenanceResponse> {
    const detail =
      await this.serviceMaintenanceRepository.getServiceMaintenanceById(
        externalId,
      );
    if (!detail) {
      throw new AppError("Service maintenance detail not found", 404);
    }
    return this.toResponse(detail);
  }

  async createServiceMaintenance(
    payload: CreateServiceMaintenanceDto,
    actorUserId?: number,
    serviceDocument?: string,
  ): Promise<ServiceMaintenanceResponse> {
    const em = this.em.fork();
    const vehicle = await this.findVehicle(em, payload.vehicle);
    const actor = await this.findActor(em, actorUserId);

    const detail = new ServiceMaintenance();
    detail.serviceName = payload.serviceName;
    detail.vehicle = vehicle;
    detail.remark = payload.remark ?? null;
    this.assignFields(detail, payload);
    detail.serviceDocument = serviceDocument ?? null;
    detail.status = payload.status ?? Status.ACTIVE;
    detail.reason = payload.reason ?? null;
    detail.createdBy = actor;

    const created =
      await this.serviceMaintenanceRepository.createServiceMaintenance(detail);
    return this.toResponse(created);
  }

  async updateServiceMaintenance(
    externalId: string,
    payload: UpdateServiceMaintenanceDto,
    actorUserId?: number,
    serviceDocument?: string,
  ): Promise<ServiceMaintenanceResponse> {
    if (Object.keys(payload).length === 0 && serviceDocument === undefined) {
      throw new AppError(
        "At least one field is required to update service maintenance",
        400,
      );
    }

    const existing =
      await this.serviceMaintenanceRepository.getServiceMaintenanceById(
        externalId,
      );
    if (!existing) {
      throw new AppError("Service maintenance detail not found", 404);
    }

    const em = this.em.fork();
    const vehicle =
      payload.vehicle !== undefined
        ? await this.findVehicle(em, payload.vehicle)
        : existing.vehicle;
    existing.serviceName = payload.serviceName ?? existing.serviceName;
    existing.vehicle = vehicle;
    if (payload.remark !== undefined) existing.remark = payload.remark;
    this.assignFields(existing, payload);
    if (serviceDocument !== undefined) {
      existing.serviceDocument = serviceDocument;
    } else if (payload.removeServiceDocument) {
      existing.serviceDocument = null;
    }
    if (payload.status !== undefined) existing.status = payload.status;
    if (payload.reason !== undefined) existing.reason = payload.reason;

    const actor = await this.findActor(em, actorUserId);
    if (actor) existing.updatedBy = actor;

    const updated =
      await this.serviceMaintenanceRepository.updateServiceMaintenance(
        existing,
      );
    return this.toResponse(updated);
  }

  async deleteServiceMaintenance(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const em = this.em.fork();
    const actor = await this.findActor(em, actorUserId);
    await this.serviceMaintenanceRepository.deleteServiceMaintenance(
      externalId,
      actor,
    );
  }

  private async findVehicle(
    em: EntityManager,
    externalId: string,
  ): Promise<AddVehicle> {
    const vehicle = await em.findOne(AddVehicle, {
      externalId,
      isDeleted: false,
    });
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }
    if (vehicle.status !== undefined && vehicle.status !== Status.ACTIVE) {
      throw new AppError("Vehicle is inactive", 400);
    }
    return vehicle;
  }

  private async findActor(
    em: EntityManager,
    actorUserId?: number,
  ): Promise<Client | undefined> {
    if (actorUserId === undefined) return undefined;
    if (!Number.isSafeInteger(actorUserId) || actorUserId <= 0) {
      throw new AppError("Invalid user ID", 401);
    }
    const actor = await em.findOne(Client, {
      id: actorUserId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!actor) {
      throw new AppError("User not found", 401);
    }
    return actor;
  }

  private assignFields(
    detail: ServiceMaintenance,
    payload: Partial<CreateServiceMaintenanceDto | UpdateServiceMaintenanceDto>,
  ): void {
    const booleanFields = [
      "odometerIntervalEnabled",
      "engineIntervalEnabled",
      "daysIntervalEnabled",
      "odometerLeftEnabled",
      "engineLeftEnabled",
      "daysLeftEnabled",
      "updateRecord",
      "mobile",
      "allowVisibilityToDriver",
    ] as const;
    for (const field of booleanFields) {
      const value = payload[field];
      if (value !== undefined) {
        detail[field] = value;
      } else if (detail[field] === undefined) {
        detail[field] = false;
      }
    }

    const numberFields = [
      "odometerInterval",
      "lastServiceOdometer",
      "engineInterval",
      "lastServiceEngine",
      "daysInterval",
      "odometerLeft",
      "engineLeft",
      "daysLeft",
    ] as const;
    for (const field of numberFields) {
      const value = payload[field];
      if (value !== undefined) {
        detail[field] = value;
      } else if (detail[field] === undefined) {
        detail[field] = null;
      }
    }

    if (payload.lastServiceDate !== undefined) {
      detail.lastServiceDate = payload.lastServiceDate
        ? new Date(payload.lastServiceDate)
        : null;
    }
  }

  private toResponse(detail: ServiceMaintenance): ServiceMaintenanceResponse {
    return {
      id: detail.externalId,
      serviceName: detail.serviceName,
      vehicle: {
        id: detail.vehicle.externalId,
        vehicle: detail.vehicle.vehicle,
      },
      remark: detail.remark ?? null,
      odometerIntervalEnabled: detail.odometerIntervalEnabled,
      odometerInterval: detail.odometerInterval ?? null,
      lastServiceOdometer: detail.lastServiceOdometer ?? null,
      engineIntervalEnabled: detail.engineIntervalEnabled,
      engineInterval: detail.engineInterval ?? null,
      lastServiceEngine: detail.lastServiceEngine ?? null,
      daysIntervalEnabled: detail.daysIntervalEnabled,
      daysInterval: detail.daysInterval ?? null,
      lastServiceDate: detail.lastServiceDate
        ? new Date(detail.lastServiceDate).toISOString().slice(0, 10)
        : null,
      odometerLeftEnabled: detail.odometerLeftEnabled,
      odometerLeft: detail.odometerLeft ?? null,
      engineLeftEnabled: detail.engineLeftEnabled,
      engineLeft: detail.engineLeft ?? null,
      daysLeftEnabled: detail.daysLeftEnabled,
      daysLeft: detail.daysLeft ?? null,
      updateRecord: detail.updateRecord,
      mobile: detail.mobile,
      serviceDocument: detail.serviceDocument ?? null,
      allowVisibilityToDriver: detail.allowVisibilityToDriver,
      status: detail.status,
      reason: detail.reason ?? null,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
    };
  }
}
