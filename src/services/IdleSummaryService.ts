import { inject, injectable } from "tsyringe";
import { TRAVEL_SUMMARY_MAX_RANGE_MS } from "../domain/models/TravelSummary";
import { TravelTrackPoint } from "../domain/models/TravelSummary";
import { IVehicleGpsDeviceRepository } from "../domain/repositories/mysql/IVehicleGpsDeviceRepository";
import { IVehicleGpsTrackingRepository } from "../domain/repositories/mongo/IVehicleGpsTrackingRepository";
import { AppError } from "../utils/errors";
import { buildIdleSummarySegments } from "../utils/idleSummary";
import {
  IIdleSummaryService,
  IdleSummaryQuery,
  IdleSummaryRow,
} from "./interfaces/IIdleSummaryService";

@injectable()
export class IdleSummaryService implements IIdleSummaryService {
  constructor(
    @inject("IVehicleGpsDeviceRepository")
    private readonly vehicleRepository: IVehicleGpsDeviceRepository,
    @inject("IVehicleGpsTrackingRepository")
    private readonly trackingRepository: IVehicleGpsTrackingRepository,
  ) {}

  async getIdleSummary(query: IdleSummaryQuery): Promise<IdleSummaryRow[]> {
    if (Number.isNaN(query.from.getTime()) || Number.isNaN(query.to.getTime())) {
      throw new AppError("Invalid from or to datetime", 400);
    }
    if (query.to.getTime() <= query.from.getTime()) {
      throw new AppError("to must be after from", 400);
    }
    if (query.to.getTime() - query.from.getTime() > TRAVEL_SUMMARY_MAX_RANGE_MS) {
      throw new AppError("Date range cannot exceed 31 days", 400);
    }
    if (
      !Number.isFinite(query.durationMinutes) ||
      query.durationMinutes < 0
    ) {
      throw new AppError("duration must be a non-negative number of minutes", 400);
    }

    const vehicles = await this.vehicleRepository.listVehiclesForTravelSummary({
      clientId: query.clientId,
      transporterId: query.transporterId,
      vehicleId: query.vehicleId,
      search: query.search,
    });
    if (vehicles.length === 0) {
      return [];
    }

    const points = await this.trackingRepository.findTravelPoints({
      vehicleIds: vehicles.map((vehicle) => vehicle.externalId),
      from: query.from,
      to: query.to,
    });
    const pointsByVehicle = groupPoints(points);

    const rows: IdleSummaryRow[] = [];
    for (const vehicle of vehicles) {
      const segments = buildIdleSummarySegments(
        pointsByVehicle.get(vehicle.externalId) ?? [],
        {
          minDurationMinutes: query.durationMinutes,
          statuses: query.statuses,
        },
      );
      for (const segment of segments) {
        rows.push({
          sn: 0,
          vehicle: {
            id: vehicle.externalId,
            vehicleNo: vehicle.vehicle ?? null,
            nickname: vehicle.vehicleNickname ?? null,
          },
          client: vehicle.client
            ? {
                id: vehicle.client.externalId,
                name: vehicle.client.name ?? null,
                companyName: vehicle.client.companyName ?? null,
              }
            : null,
          transporter: vehicle.transporter
            ? {
                id: vehicle.transporter.externalId,
                name: vehicle.transporter.name ?? null,
                companyName: vehicle.transporter.companyName ?? null,
              }
            : null,
          status: segment.status,
          startTime: segment.startTime.toISOString(),
          endTime: segment.endTime.toISOString(),
          durationMinutes: segment.durationMinutes,
          location: segment.address,
          latitude: segment.latitude,
          longitude: segment.longitude,
        });
      }
    }

    rows.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
    return rows.map((row, index) => ({ ...row, sn: index + 1 }));
  }
}

function groupPoints(points: TravelTrackPoint[]): Map<string, TravelTrackPoint[]> {
  const grouped = new Map<string, TravelTrackPoint[]>();
  for (const point of points) {
    const rows = grouped.get(point.vehicleId) ?? [];
    rows.push(point);
    grouped.set(point.vehicleId, rows);
  }
  return grouped;
}
