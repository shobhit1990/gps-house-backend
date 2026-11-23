import { FilterQuery } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import { AddVehicle } from "../domain/entities/mysql/AddVehicle";
import { Status } from "../domain/enums/status";
import { IAddVehicleService } from "./interfaces/IAddVehicleService";
import {
  ISimTrackingService,
  SimTrackingReportItem,
  SimTrackingReportQuery,
  SimTrackingReportResult,
  SimTrackingStatusFilter,
} from "./interfaces/ISimTrackingService";

const populate = [
  "createdBy",
  "client",
  "client.owner_name",
  "client.language",
  "client.timezone",
  "device",
  "device.deviceType",
  "device.client",
  "transporter",
  "transporter.client",
  "transporter.language",
  "transporter.timezone",
] as const;

@injectable()
export class SimTrackingService implements ISimTrackingService {
  constructor(
    @inject(EntityManager)
    private readonly em: EntityManager,
    @inject("IAddVehicleService")
    private readonly addVehicleService: IAddVehicleService,
  ) {}

  async getSimTrackingReport(
    query: SimTrackingReportQuery = {},
  ): Promise<SimTrackingReportResult> {
    const statusFilter: SimTrackingStatusFilter = query.status ?? "All";
    const search = query.search?.trim() || undefined;

    const where: FilterQuery<AddVehicle> = {
      isDeleted: false,
      device: { $ne: null },
    };

    if (statusFilter === "Active") {
      where.status = Status.ACTIVE;
    } else if (statusFilter === "Inactive") {
      where.status = Status.INACTIVE;
    }

    if (search) {
      const like = `%${search.replace(/[%_]/g, "")}%`;
      where.$or = [
        { vehicle: { $like: like } },
        { device: { simNumber: { $like: like } } },
        { ownerName: { $like: like } },
      ];
    }

    const vehicles = await this.em.fork().find(AddVehicle, where, {
      populate: [...populate],
      orderBy: { createdAt: "DESC" },
    });

    return {
      remainingCoins: 0,
      filter: {
        status: statusFilter,
        search: search ?? null,
      },
      data: vehicles.map((vehicle) => this.toItem(vehicle)),
    };
  }

  private toItem(vehicle: AddVehicle): SimTrackingReportItem {
    const createdBy = vehicle.createdBy ?? vehicle.client;
    const minutes = vehicle.minutes ? Number(vehicle.minutes) : null;

    return {
      ...this.addVehicleService.mapVehicleDetail(vehicle),
      vehicleNo: vehicle.vehicle,
      vehicleStatus: vehicle.status ?? null,
      createdBy: createdBy
        ? (createdBy.name ?? createdBy.companyName ?? null)
        : null,
      simNo: vehicle.device?.simNumber ?? null,
      consent: null,
      startDate: vehicle.subscriptionStartDate ?? null,
      endDate: vehicle.subscriptionDueDate ?? null,
      frequencyMinutes: Number.isFinite(minutes) ? minutes : null,
    };
  }
}
