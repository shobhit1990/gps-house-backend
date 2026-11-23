import { FilterQuery } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import { AddGroup } from "../domain/entities/mysql/AddGroup";
import { AddVehicle } from "../domain/entities/mysql/AddVehicle";
import { Geofence } from "../domain/entities/mysql/Geofence";
import { PoiFilterType } from "../domain/enums/PoiFilterType";
import { PoiReportType } from "../domain/enums/PoiReportType";
import { TRAVEL_SUMMARY_MAX_RANGE_MS } from "../domain/models/TravelSummary";
import { AppError } from "../utils/errors";
import { IAddVehicleService } from "./interfaces/IAddVehicleService";
import {
  IPoiReportService,
  PoiReportQuery,
  PoiReportResult,
} from "./interfaces/IPoiReportService";

@injectable()
export class PoiReportService implements IPoiReportService {
  constructor(
    @inject(EntityManager)
    private readonly em: EntityManager,
    @inject("IAddVehicleService")
    private readonly vehicleService: IAddVehicleService,
  ) {}

  async getPoiReport(query: PoiReportQuery): Promise<PoiReportResult> {
    this.assertDateRange(query.from, query.to);

    if (query.type === PoiReportType.VEHICLE_WISE) {
      if (!query.filterType) {
        throw new AppError(
          `filterType is required when type="${PoiReportType.VEHICLE_WISE}". Use: ${Object.values(PoiFilterType).join(", ")}`,
          400,
        );
      }

      if (query.filterType === PoiFilterType.TRANSPORTER) {
        return {
          type: query.type,
          filterType: PoiFilterType.TRANSPORTER,
          data: await this.getTransporterVehicleRows(query),
        };
      }

      if (query.filterType === PoiFilterType.GROUP) {
        return {
          type: query.type,
          filterType: PoiFilterType.GROUP,
          data: await this.getGroupRows(query),
        };
      }

      throw new AppError(
        `Invalid filterType. Use PoiFilterType: ${Object.values(PoiFilterType).join(", ")}`,
        400,
      );
    }

    if (query.type === PoiReportType.GEOFENCE_WISE) {
      return {
        type: query.type,
        filterType: null,
        data: await this.getGeofenceRows(query),
      };
    }

    throw new AppError(
      `Invalid type. Use PoiReportType: ${Object.values(PoiReportType).join(", ")}`,
      400,
    );
  }

  /** Vehicle Wise + Transporter → transporter / vehicle columns. */
  private async getTransporterVehicleRows(
    query: PoiReportQuery,
  ): Promise<Record<string, unknown>[]> {
    const where: FilterQuery<AddVehicle> = { isDeleted: false };

    if (query.transporterId) {
      where.transporter = {
        externalId: query.transporterId,
        isDeleted: false,
      };
    }
    if (query.vehicleId) {
      where.externalId = query.vehicleId;
    }
    if (query.search?.trim()) {
      const like = `%${query.search.trim().replace(/[%_]/g, "")}%`;
      where.$or = [
        { vehicle: { $like: like } },
        { vehicleNickname: { $like: like } },
        { ownerName: { $like: like } },
      ];
    }

    const vehicles = await this.em.fork().find(AddVehicle, where, {
      populate: [
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
      ],
      orderBy: { vehicle: "ASC" },
    });

    return vehicles.map((vehicle, index) => ({
      sn: index + 1,
      reportType: PoiReportType.VEHICLE_WISE,
      filterType: PoiFilterType.TRANSPORTER,
      from: query.from.toISOString(),
      to: query.to.toISOString(),
      ...this.vehicleService.mapVehicleDetail(vehicle),
    }));
  }

  /** Vehicle Wise + Group → group columns (master). */
  private async getGroupRows(
    query: PoiReportQuery,
  ): Promise<Record<string, unknown>[]> {
    const where: FilterQuery<AddGroup> = { isDeleted: false };

    if (query.groupId) {
      where.externalId = query.groupId;
    }
    if (query.search?.trim()) {
      const like = `%${query.search.trim().replace(/[%_]/g, "")}%`;
      where.groupName = { $like: like };
    }

    const groups = await this.em.fork().find(AddGroup, where, {
      populate: ["vehicle", "transporter"],
      orderBy: { groupName: "ASC" },
    });

    return groups.map((group, index) => ({
      sn: index + 1,
      reportType: PoiReportType.VEHICLE_WISE,
      filterType: PoiFilterType.GROUP,
      from: query.from.toISOString(),
      to: query.to.toISOString(),
      id: group.externalId,
      groupName: group.groupName,
      assignedTo: group.assignedTo,
      vehicle: group.vehicle
        ? {
            id: group.vehicle.externalId,
            name: group.vehicle.vehicle ?? null,
          }
        : null,
      transporter: group.transporter
        ? {
            id: group.transporter.externalId,
            name: group.transporter.companyName ?? null,
            userName: group.transporter.userName ?? null,
          }
        : null,
      status: group.status ?? null,
      reason: group.reason ?? null,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));
  }

  /** Geofence Wise → geofence columns. */
  private async getGeofenceRows(
    query: PoiReportQuery,
  ): Promise<Record<string, unknown>[]> {
    const where: FilterQuery<Geofence> = { isDeleted: false };

    if (query.geofenceId) {
      where.externalId = query.geofenceId;
    }
    if (query.search?.trim()) {
      const like = `%${query.search.trim().replace(/[%_]/g, "")}%`;
      where.$or = [
        { name: { $like: like } },
        { geofenceCode: { $like: like } },
      ];
    }

    const geofences = await this.em.fork().find(Geofence, where, {
      populate: ["type"],
      orderBy: { name: "ASC" },
    });

    return geofences.map((geofence, index) => ({
      sn: index + 1,
      reportType: PoiReportType.GEOFENCE_WISE,
      filterType: null,
      from: query.from.toISOString(),
      to: query.to.toISOString(),
      id: geofence.externalId,
      name: geofence.name,
      type: {
        id: geofence.type.externalId,
        geofType: geofence.type.geofType,
      },
      assignType: geofence.assignType,
      geofenceCode: geofence.geofenceCode ?? null,
      transitTime: geofence.transitTime ?? null,
      shapes: geofence.shapes ?? null,
      geoType: geofence.geoType ?? null,
      latitude: toCoordinateNumber(geofence.latitude),
      longitude: toCoordinateNumber(geofence.longitude),
      radius: geofence.radius ?? null,
      status: geofence.status ?? null,
      reason: geofence.reason ?? null,
      createdAt: geofence.createdAt,
      updatedAt: geofence.updatedAt,
    }));
  }

  private assertDateRange(from: Date, to: Date): void {
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new AppError("Invalid from or to datetime", 400);
    }
    if (to.getTime() <= from.getTime()) {
      throw new AppError("to must be after from", 400);
    }
    if (to.getTime() - from.getTime() > TRAVEL_SUMMARY_MAX_RANGE_MS) {
      throw new AppError("Date range cannot exceed 31 days", 400);
    }
  }
}

function toCoordinateNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (Array.isArray(value) && value.length > 0) return Number(value[0]);
  return Number(value);
}
