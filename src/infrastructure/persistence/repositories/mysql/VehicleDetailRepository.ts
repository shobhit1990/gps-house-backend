import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { VehicleDetail } from "../../../../domain/entities/mysql/VehicleDetail";
import { Client } from "../../../../domain/entities/mysql/Client";
import { Transporter } from "../../../../domain/entities/mysql/Transporter";
import { AddVehicle } from "../../../../domain/entities/mysql/AddVehicle";
import { IVehicleDetailRepository } from "../../../../domain/repositories/mysql/IVehicleDetailRepository";
import { AppError } from "../../../../utils/errors";

const populate = [
  "client",
  "transporter",
  "vehicle",
  "createdBy",
  "updatedBy",
  "deletedBy",
] as const;

@injectable()
export class VehicleDetailRepository implements IVehicleDetailRepository {
  constructor(private readonly em: EntityManager) {}

  async getVehicleDetails(): Promise<VehicleDetail[]> {
    return this.em
      .fork()
      .find(
        VehicleDetail,
        { isDeleted: false },
        { populate: [...populate]},
      );
  }

  async getVehicleDetailById(
    externalId: string,
  ): Promise<VehicleDetail | null> {
    return this.em
      .fork()
      .findOne(
        VehicleDetail,
        { externalId, isDeleted: false },
        { populate: [...populate] },
      );
  }

  async createVehicleDetail(
    vehicleDetail: VehicleDetail,
  ): Promise<VehicleDetail> {
    const em = this.em.fork();
    vehicleDetail.client = em.getReference(Client, vehicleDetail.client.id);
    vehicleDetail.transporter = em.getReference(
      Transporter,
      vehicleDetail.transporter.id,
    );
    vehicleDetail.vehicle = em.getReference(
      AddVehicle,
      vehicleDetail.vehicle.id,
    );
    if (vehicleDetail.createdBy) {
      vehicleDetail.createdBy = em.getReference(
        Client,
        vehicleDetail.createdBy.id,
      );
    }
    await em.persistAndFlush(vehicleDetail);
    await em.populate(vehicleDetail, [...populate]);
    return vehicleDetail;
  }

  async updateVehicleDetail(
    vehicleDetail: VehicleDetail,
  ): Promise<VehicleDetail> {
    const em = this.em.fork();
    const existing = await em.findOne(
      VehicleDetail,
      { externalId: vehicleDetail.externalId, isDeleted: false },
      { populate: [...populate] },
    );
    if (!existing) {
      throw new AppError("Vehicle detail not found", 404);
    }

    em.assign(existing, {
      client: em.getReference(Client, vehicleDetail.client.id),
      transporter: em.getReference(Transporter, vehicleDetail.transporter.id),
      vehicle: em.getReference(AddVehicle, vehicleDetail.vehicle.id),
      ownerName: vehicleDetail.ownerName,
      ownedBy: vehicleDetail.ownedBy,
      vehicleBrand: vehicleDetail.vehicleBrand,
      vehicleModel: vehicleDetail.vehicleModel,
      vehicleBody: vehicleDetail.vehicleBody,
      capacity: vehicleDetail.capacity,
      manufactureDate: vehicleDetail.manufactureDate,
      purchaseDate: vehicleDetail.purchaseDate,
      status: vehicleDetail.status,
      reason: vehicleDetail.reason,
      ...(vehicleDetail.updatedBy
        ? { updatedBy: em.getReference(Client, vehicleDetail.updatedBy.id) }
        : {}),
      updatedAt: new Date(),
    });
    await em.flush();
    await em.populate(existing, [...populate]);
    return existing;
  }

  async deleteVehicleDetail(
    externalId: string,
    deletedBy?: Client,
  ): Promise<void> {
    const em = this.em.fork();
    const vehicleDetail = await em.findOne(VehicleDetail, {
      externalId,
      isDeleted: false,
    });
    if (!vehicleDetail) {
      throw new AppError("Vehicle detail not found", 404);
    }

    const now = new Date();
    vehicleDetail.isDeleted = true;
    vehicleDetail.deletedAt = now;
    vehicleDetail.updatedAt = now;
    if (deletedBy) {
      vehicleDetail.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }
}
