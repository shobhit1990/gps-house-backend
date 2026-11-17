import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { AddVehicle } from "../../../../domain/entities/mysql/AddVehicle";
import { Device } from "../../../../domain/entities/mysql/Device";
import { IAddVehicleRepository } from "../../../../domain/repositories/mysql/IAddVehicleRepository";
import { AppError } from "../../../../utils/errors";

const populate = ["client", "device", "transporter"] as const;
const detailsPopulate = [
  "client.owner_name",
  "client.language",
  "client.timezone",
  "device.deviceType",
  "device.client",
  "transporter.client",
  "transporter.language",
  "transporter.timezone",
] as const;

@injectable()
export class AddVehicleRepository implements IAddVehicleRepository {
  constructor(private readonly em: EntityManager) {}

  async getAddVehicle(): Promise<AddVehicle[]> {
    return this.em.fork().find(
      AddVehicle,
      { isDeleted: false },
      {
        populate: [...populate, ...detailsPopulate],
      },
    );
  }

  async getAddVehicleById(externalId: string): Promise<AddVehicle | null> {
    return this.em
      .fork()
      .findOne(
        AddVehicle,
        { externalId, isDeleted: false },
        { populate: [...populate, ...detailsPopulate] },
      );
  }

  async createAddVehicle(vehicle: AddVehicle): Promise<AddVehicle> {
    const em = this.em.fork();
    if (vehicle.device) {
      vehicle.device = em.getReference(Device, vehicle.device.id);
    }
    await em.persistAndFlush(vehicle);
    await em.populate(vehicle, [...populate]);
    return vehicle;
  }

  async updateAddVehicle(vehicle: AddVehicle): Promise<AddVehicle> {
    const em = this.em.fork();
    const existing = await em.findOne(AddVehicle, {
      externalId: vehicle.externalId,
      isDeleted: false,
    });

    if (!existing) {
      throw new AppError("Vehicle not found", 404);
    }

    em.assign(existing, vehicle);
    if (vehicle.device) {
      existing.device = em.getReference(Device, vehicle.device.id);
    }
    await em.flush();
    await em.populate(existing, [...populate]);
    return existing;
  }

  async deleteAddVehicle(externalId: string): Promise<void> {
    const em = this.em.fork();
    const vehicle = await em.findOne(AddVehicle, {
      externalId,
      isDeleted: false,
    });

    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    vehicle.isDeleted = true;
    vehicle.updatedAt = new Date();
    await em.flush();
  }
}
