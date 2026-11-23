import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import { Geofence } from "../domain/entities/mysql/Geofence";
import { Duration } from "../domain/enums/Duration";
import { TRAVEL_SUMMARY_MAX_RANGE_MS } from "../domain/models/TravelSummary";
import { TravelTrackPoint } from "../domain/models/TravelSummary";
import { IVehicleGpsDeviceRepository } from "../domain/repositories/mysql/IVehicleGpsDeviceRepository";
import { IVehicleGpsTrackingRepository } from "../domain/repositories/mongo/IVehicleGpsTrackingRepository";
import { AppError } from "../utils/errors";
import {
  buildGeofenceVisits,
  GeofenceArea,
  matchesDuration,
} from "../utils/geofenceReport";
import { IAddVehicleService } from "./interfaces/IAddVehicleService";
import {
  GeofenceReportQuery,
  GeofenceReportRow,
  IGeofenceReportService,
} from "./interfaces/IGeofenceReportService";

@injectable()
export class GeofenceReportService implements IGeofenceReportService {
  constructor(
    @inject(EntityManager)
    private readonly em: EntityManager,
    @inject("IVehicleGpsDeviceRepository")
    private readonly vehicleRepository: IVehicleGpsDeviceRepository,
    @inject("IVehicleGpsTrackingRepository")
    private readonly trackingRepository: IVehicleGpsTrackingRepository,
    @inject("IAddVehicleService")
    private readonly vehicleService: IAddVehicleService,
  ) {}

  async getGeofenceReport(
    query: GeofenceReportQuery,
  ): Promise<GeofenceReportRow[]> {
    this.assertDateRange(query.from, query.to);
    this.assertDuration(query.duration);

    const vehicles = await this.vehicleRepository.listVehiclesForTravelSummary({
      clientId: query.clientId,
      transporterId: query.transporterId,
      vehicleId: query.vehicleId,
      search: query.search,
    });
    if (vehicles.length === 0) {
      return [];
    }

    const geofences = await this.loadGeofenceAreas();
    if (geofences.length === 0) {
      return [];
    }

    const points = await this.trackingRepository.findTravelPoints({
      vehicleIds: vehicles.map((vehicle) => vehicle.externalId),
      from: query.from,
      to: query.to,
    });
    const pointsByVehicle = groupPoints(points);

    const rows: GeofenceReportRow[] = [];
    for (const vehicle of vehicles) {
      const detail = this.vehicleService.mapVehicleDetail(vehicle);
      const visits = buildGeofenceVisits(
        pointsByVehicle.get(vehicle.externalId) ?? [],
        geofences,
      );

      for (const visit of visits) {
        if (!matchesDuration(visit.haltMinutes, query.duration)) {
          continue;
        }
        rows.push({
          sn: 0,
          ...detail,
          vehicleNo: vehicle.vehicle,
          geoName: visit.geoName,
          inTime: visit.inTime.toISOString(),
          outTime: visit.outTime.toISOString(),
          inLoc: formatCoordinate(visit.inLatitude, visit.inLongitude),
          outLoc: formatCoordinate(visit.outLatitude, visit.outLongitude),
          inAddress: visit.inAddress,
          outAddress: visit.outAddress,
          haltTimeMinutes: visit.haltMinutes,
          distanceMeters: visit.distanceMeters,
          distanceKm: Math.round((visit.distanceMeters / 1000) * 100) / 100,
          reportType: visit.reportType,
          remark: visit.remark,
          geofenceId: visit.geofenceId,
          inLatitude: visit.inLatitude,
          inLongitude: visit.inLongitude,
          outLatitude: visit.outLatitude,
          outLongitude: visit.outLongitude,
        });
      }
    }

    rows.sort(
      (a, b) => new Date(a.inTime).getTime() - new Date(b.inTime).getTime(),
    );
    return rows.map((row, index) => ({ ...row, sn: index + 1 }));
  }

  private async loadGeofenceAreas(): Promise<GeofenceArea[]> {
    const geofences = await this.em.fork().find(
      Geofence,
      { isDeleted: false },
      { populate: ["type"], orderBy: { name: "ASC" } },
    );

    return geofences
      .map((geofence) => {
        const latitude = toCoordinateNumber(geofence.latitude);
        const longitude = toCoordinateNumber(geofence.longitude);
        if (latitude === null || longitude === null) {
          return null;
        }
        return {
          id: geofence.externalId,
          name: geofence.name,
          shapes: geofence.shapes ?? null,
          latitude,
          longitude,
          radius: geofence.radius ?? null,
          reportType: geofence.type?.geofType ?? geofence.geoType ?? null,
          remark: geofence.reason ?? null,
        } satisfies GeofenceArea;
      })
      .filter((row): row is GeofenceArea => row !== null);
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

  private assertDuration(duration: Duration): void {
    if (!Object.values(Duration).includes(duration)) {
      throw new AppError(
        `Invalid duration. Use Duration enum: ${Object.values(Duration).join(", ")}`,
        400,
      );
    }
  }
}

function groupPoints(
  points: TravelTrackPoint[],
): Map<string, TravelTrackPoint[]> {
  const grouped = new Map<string, TravelTrackPoint[]>();
  for (const point of points) {
    const rows = grouped.get(point.vehicleId) ?? [];
    rows.push(point);
    grouped.set(point.vehicleId, rows);
  }
  return grouped;
}

function formatCoordinate(
  latitude: number | null,
  longitude: number | null,
): string | null {
  if (latitude === null || longitude === null) {
    return null;
  }
  return `${latitude}, ${longitude}`;
}

function toCoordinateNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (Array.isArray(value) && value.length > 0) {
    const parsed = Number(value[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
