import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateVehicleDetailDto,
  UpdateVehicleDetailDto,
} from "../domain/dto/VehicleDetailDto";
import { AddVehicle } from "../domain/entities/mysql/AddVehicle";
import { Client } from "../domain/entities/mysql/Client";
import { Transporter } from "../domain/entities/mysql/Transporter";
import { VehicleDetail } from "../domain/entities/mysql/VehicleDetail";
import { Status } from "../domain/enums/status";
import { IVehicleDetailRepository } from "../domain/repositories/mysql/IVehicleDetailRepository";
import { AppError } from "../utils/errors";
import {
  IVehicleDetailService,
  VehicleDetailResponse,
} from "./interfaces/IVehicleDetailService";

@injectable()
export class VehicleDetailService implements IVehicleDetailService {
  constructor(
    @inject("IVehicleDetailRepository")
    private readonly vehicleDetailRepository: IVehicleDetailRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getVehicleDetails(): Promise<VehicleDetailResponse[]> {
    const details = await this.vehicleDetailRepository.getVehicleDetails();
    return details.map((detail) => this.toResponse(detail));
  }

  async getVehicleDetailById(
    externalId: string,
  ): Promise<VehicleDetailResponse> {
    const detail =
      await this.vehicleDetailRepository.getVehicleDetailById(externalId);
    if (!detail) {
      throw new AppError("Vehicle detail not found", 404);
    }
    return this.toResponse(detail);
  }

  async createVehicleDetail(
    payload: CreateVehicleDetailDto,
    actorUserId?: number,
  ): Promise<VehicleDetailResponse> {
    const { client, transporter, vehicle } = await this.resolveRelations(
      payload.client,
      payload.transporter,
      payload.vehicle,
    );
    const detail = new VehicleDetail();
    detail.client = client;
    detail.transporter = transporter;
    detail.vehicle = vehicle;
    detail.createdBy = await this.findActor(actorUserId);
    this.assignOptionalFields(detail, payload);
    return this.toResponse(
      await this.vehicleDetailRepository.createVehicleDetail(detail),
    );
  }

  async updateVehicleDetail(
    externalId: string,
    payload: UpdateVehicleDetailDto,
    actorUserId?: number,
  ): Promise<VehicleDetailResponse> {
    const detail =
      await this.vehicleDetailRepository.getVehicleDetailById(externalId);
    if (!detail) {
      throw new AppError("Vehicle detail not found", 404);
    }

    const { client, transporter, vehicle } = await this.resolveRelations(
      payload.client ?? detail.client.externalId,
      payload.transporter ?? detail.transporter.externalId,
      payload.vehicle ?? detail.vehicle.externalId,
    );
    detail.client = client;
    detail.transporter = transporter;
    detail.vehicle = vehicle;
    detail.updatedBy = await this.findActor(actorUserId);
    this.assignOptionalFields(detail, payload);
    return this.toResponse(
      await this.vehicleDetailRepository.updateVehicleDetail(detail),
    );
  }

  async deleteVehicleDetail(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.vehicleDetailRepository.deleteVehicleDetail(externalId, actor);
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

  private async resolveRelations(
    clientId: string,
    transporterId: string,
    vehicleId: string,
  ): Promise<{
    client: Client;
    transporter: Transporter;
    vehicle: AddVehicle;
  }> {
    const em = this.em.fork();
    const [client, transporter, vehicle] = await Promise.all([
      em.findOne(Client, { externalId: clientId, isDeleted: false }),
      em.findOne(Transporter, { externalId: transporterId, isDeleted: false }),
      em.findOne(AddVehicle, { externalId: vehicleId, isDeleted: false }),
    ]);

    if (!client) throw new AppError("Client not found", 404);
    if (!transporter) throw new AppError("Transporter not found", 404);
    if (!vehicle) throw new AppError("Vehicle not found", 404);
    return { client, transporter, vehicle };
  }

  private assignOptionalFields(
    detail: VehicleDetail,
    payload: CreateVehicleDetailDto | UpdateVehicleDetailDto,
  ): void {
    if (payload.ownerName !== undefined) {
      detail.ownerName = payload.ownerName ?? undefined;
    }
    if (payload.ownedBy !== undefined) {
      detail.ownedBy = payload.ownedBy ?? undefined;
    }
    if (payload.vehicleBrand !== undefined) {
      detail.vehicleBrand = payload.vehicleBrand ?? undefined;
    }
    if (payload.vehicleModel !== undefined) {
      detail.vehicleModel = payload.vehicleModel ?? undefined;
    }
    if (payload.vehicleBody !== undefined) {
      detail.vehicleBody = payload.vehicleBody ?? undefined;
    }
    if (payload.capacity !== undefined) {
      detail.capacity = payload.capacity ?? undefined;
    }
    if (payload.manufactureDate !== undefined) {
      detail.manufactureDate = payload.manufactureDate
        ? new Date(payload.manufactureDate)
        : undefined;
    }
    if (payload.purchaseDate !== undefined) {
      detail.purchaseDate = payload.purchaseDate
        ? new Date(payload.purchaseDate)
        : undefined;
    }
    if (payload.status !== undefined) {
      detail.status = payload.status ?? undefined;
    }
    if (payload.reason !== undefined) {
      detail.reason = payload.reason ?? undefined;
    }
  }

  private toResponse(detail: VehicleDetail): VehicleDetailResponse {
    return {
      id: detail.externalId,
      client: {
        id: detail.client.externalId,
        name: detail.client.name ?? null,
        companyName: detail.client.companyName,
      },
      transporter: {
        id: detail.transporter.externalId,
        name: detail.transporter.name ?? null,
        companyName: detail.transporter.companyName,
      },
      vehicle: {
        id: detail.vehicle.externalId,
        vehicle: detail.vehicle.vehicle,
      },
      ownerName: detail.ownerName ?? null,
      ownedBy: detail.ownedBy ?? null,
      vehicleBrand: detail.vehicleBrand ?? null,
      vehicleModel: detail.vehicleModel ?? null,
      vehicleBody: detail.vehicleBody ?? null,
      capacity: detail.capacity ?? null,
      manufactureDate: detail.manufactureDate ?? null,
      purchaseDate: detail.purchaseDate ?? null,
      status: detail.status ?? null,
      reason: detail.reason ?? null,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt
    };
  }
}
