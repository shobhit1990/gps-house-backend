import { FilterQuery } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { AddVehicle } from "../../../../domain/entities/mysql/AddVehicle";
import { Device } from "../../../../domain/entities/mysql/Device";
import {
  IAddVehicleRepository,
  SubscriptionReportFilter,
} from "../../../../domain/repositories/mysql/IAddVehicleRepository";
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

  async getAddVehicle(
    filter: SubscriptionReportFilter = {},
  ): Promise<AddVehicle[]> {
    const where: FilterQuery<AddVehicle> = { isDeleted: false };
    this.applyClientTransporterFilter(where, filter);

    return this.em.fork().find(AddVehicle, where, {
      populate: [...populate, ...detailsPopulate],
    });
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

  async getSubscriptionExpired(
    filter: SubscriptionReportFilter,
  ): Promise<AddVehicle[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: FilterQuery<AddVehicle> = {
      isDeleted: false,
      subscriptionDueDate: { $lt: today },
    };
    this.applyClientTransporterFilter(where, filter);

    return this.em.fork().find(AddVehicle, where, {
      populate: [...populate, ...detailsPopulate],
      orderBy: { subscriptionDueDate: "ASC" },
    });
  }

  async getSubscriptionChanged(
    filter: SubscriptionReportFilter,
  ): Promise<AddVehicle[]> {
    const where: FilterQuery<AddVehicle> = {
      isDeleted: false,
    };
    this.applyClientTransporterFilter(where, filter);

    const vehicles = await this.em.fork().find(AddVehicle, where, {
      populate: [...populate, ...detailsPopulate],
      orderBy: { updatedAt: "DESC" },
    });

    // Subscription "changed" = transporter extend date differs from due date
    return vehicles.filter((vehicle) => {
      const due = vehicle.transporter.subscriptionDueDate;
      const extended = vehicle.transporter.subscriptionExtendDate;
      if (!extended) return false;
      if (!due) return true;
      return this.toDateKey(due) !== this.toDateKey(extended);
    });
  }

  private applyClientTransporterFilter(
    where: FilterQuery<AddVehicle>,
    filter: SubscriptionReportFilter,
  ): void {
    const criteria = where as Record<string, unknown>;

    if (filter.clientExternalId) {
      criteria.client = {
        externalId: filter.clientExternalId,
        isDeleted: false,
      };
    }

    if (filter.transporterExternalId) {
      criteria.transporter = {
        externalId: filter.transporterExternalId,
        isDeleted: false,
      };
    }

    if (filter.vehicleExternalId) {
      criteria.externalId = filter.vehicleExternalId;
    }
  }

  private toDateKey(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    return String(value).slice(0, 10);
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
