import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { Client } from "../../../../domain/entities/mysql/Client";
import { Transporter } from "../../../../domain/entities/mysql/Transporter";
import { VehicleConfig } from "../../../../domain/entities/mysql/VehicleConfig";
import { IVehicleConfigRepository } from "../../../../domain/repositories/mysql/IVehicleConfigRepository";
import { AppError } from "../../../../utils/errors";

const populate = [
  "transporter",
  "createdBy",
  "updatedBy",
  "deletedBy",
] as const;

@injectable()
export class VehicleConfigRepository implements IVehicleConfigRepository {
  constructor(private readonly em: EntityManager) {}

  async getVehicleConfigs(): Promise<VehicleConfig[]> {
    return this.em
      .fork()
      .find(VehicleConfig, { isDeleted: false }, { populate: [...populate] });
  }

  async getVehicleConfigById(
    externalId: string,
  ): Promise<VehicleConfig | null> {
    return this.em
      .fork()
      .findOne(
        VehicleConfig,
        { externalId, isDeleted: false },
        { populate: [...populate] },
      );
  }

  async createVehicleConfig(
    vehicleConfig: VehicleConfig,
  ): Promise<VehicleConfig> {
    const em = this.em.fork();
    vehicleConfig.transporter = em.getReference(
      Transporter,
      vehicleConfig.transporter.id,
    );
    if (vehicleConfig.createdBy) {
      vehicleConfig.createdBy = em.getReference(
        Client,
        vehicleConfig.createdBy.id,
      );
    }
    await em.persistAndFlush(vehicleConfig);
    return (await em.findOne(
      VehicleConfig,
      { externalId: vehicleConfig.externalId },
      { populate: [...populate] },
    ))!;
  }

  async updateVehicleConfig(
    vehicleConfig: VehicleConfig,
  ): Promise<VehicleConfig> {
    const em = this.em.fork();
    const existing = await em.findOne(VehicleConfig, {
      externalId: vehicleConfig.externalId,
      isDeleted: false,
    });
    if (!existing) {
      throw new AppError("Vehicle config not found", 404);
    }

    em.assign(existing, {
      transporter: em.getReference(Transporter, vehicleConfig.transporter.id),
      distanceVariation: vehicleConfig.distanceVariation,
      lockButton: vehicleConfig.lockButton,
      status: vehicleConfig.status,
      reason: vehicleConfig.reason,
      ...(vehicleConfig.updatedBy
        ? {
            updatedBy: em.getReference(Client, vehicleConfig.updatedBy.id),
          }
        : {}),
      updatedAt: new Date(),
    });
    await em.flush();

    return (await em.findOne(
      VehicleConfig,
      { externalId: existing.externalId },
      { populate: [...populate] },
    ))!;
  }

  async deleteVehicleConfig(
    externalId: string,
    deletedBy?: Client,
  ): Promise<void> {
    const em = this.em.fork();
    const vehicleConfig = await em.findOne(VehicleConfig, {
      externalId,
      isDeleted: false,
    });
    if (!vehicleConfig) {
      throw new AppError("Vehicle config not found", 404);
    }

    const now = new Date();
    vehicleConfig.isDeleted = true;
    vehicleConfig.deletedAt = now;
    vehicleConfig.updatedAt = now;
    if (deletedBy) {
      vehicleConfig.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }
}
