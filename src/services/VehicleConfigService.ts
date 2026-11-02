import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateVehicleConfigDto,
  UpdateVehicleConfigDto,
} from "../domain/dto/VehicleConfigDto";
import { Client } from "../domain/entities/mysql/Client";
import { Transporter } from "../domain/entities/mysql/Transporter";
import { VehicleConfig } from "../domain/entities/mysql/VehicleConfig";
import { Status } from "../domain/enums/status";
import { IVehicleConfigRepository } from "../domain/repositories/mysql/IVehicleConfigRepository";
import { AppError } from "../utils/errors";
import {
  IVehicleConfigService,
  VehicleConfigResponse,
} from "./interfaces/IVehicleConfigService";

@injectable()
export class VehicleConfigService implements IVehicleConfigService {
  constructor(
    @inject("IVehicleConfigRepository")
    private readonly repository: IVehicleConfigRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getVehicleConfigs(): Promise<VehicleConfigResponse[]> {
    const configs = await this.repository.getVehicleConfigs();
    return configs.map((config) => this.toResponse(config));
  }

  async getVehicleConfigById(
    externalId: string,
  ): Promise<VehicleConfigResponse> {
    const config = await this.repository.getVehicleConfigById(externalId);
    if (!config) {
      throw new AppError("Vehicle config not found", 404);
    }
    return this.toResponse(config);
  }

  async createVehicleConfig(
    payload: CreateVehicleConfigDto,
    actorUserId?: number,
  ): Promise<VehicleConfigResponse> {
    const [transporter, actor] = await Promise.all([
      this.findTransporter(payload.transporter),
      this.findActor(actorUserId),
    ]);

    const config = new VehicleConfig();
    config.transporter = transporter;
    config.distanceVariation = payload.distanceVariation;
    config.lockButton = payload.lockButton;
    config.status = payload.status;
    config.reason = payload.reason ?? null;
    config.createdBy = actor;
    return this.toResponse(await this.repository.createVehicleConfig(config));
  }

  async updateVehicleConfig(
    externalId: string,
    payload: UpdateVehicleConfigDto,
    actorUserId?: number,
  ): Promise<VehicleConfigResponse> {
    if (Object.keys(payload).length === 0) {
      throw new AppError(
        "At least one field is required to update a vehicle config",
        400,
      );
    }
    const config = await this.repository.getVehicleConfigById(externalId);
    if (!config) {
      throw new AppError("Vehicle config not found", 404);
    }

    if (payload.transporter !== undefined) {
      config.transporter = await this.findTransporter(payload.transporter);
    }
    if (payload.distanceVariation !== undefined) {
      config.distanceVariation = payload.distanceVariation;
    }
    if (payload.lockButton !== undefined)
      config.lockButton = payload.lockButton;
    if (payload.status !== undefined) config.status = payload.status;
    if (payload.reason !== undefined) config.reason = payload.reason;

    const actor = await this.findActor(actorUserId);
    if (actor) config.updatedBy = actor;
    return this.toResponse(await this.repository.updateVehicleConfig(config));
  }

  async deleteVehicleConfig(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.repository.deleteVehicleConfig(externalId, actor);
  }

  private async findTransporter(externalId: string): Promise<Transporter> {
    const transporter = await this.em.fork().findOne(Transporter, {
      externalId,
      isDeleted: false,
    });
    if (!transporter) {
      throw new AppError("Transporter not found", 404);
    }
    return transporter;
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

  private toResponse(config: VehicleConfig): VehicleConfigResponse {
    return {
      id: config.externalId,
      transporter: {
        id: config.transporter.externalId,
        companyName: config.transporter.companyName,
        name: config.transporter.name ?? null,
      },
      distanceVariation: config.distanceVariation,
      lockButton: config.lockButton,
      status: config.status ?? null,
      reason: config.reason ?? null,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}
