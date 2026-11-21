import { inject, injectable } from "tsyringe";
import { ReportType } from "../domain/enums/ReportType";
import { SortOrder } from "../domain/enums/SortType";
import { TRAVEL_SUMMARY_MAX_RANGE_MS } from "../domain/models/TravelSummary";
import { TravelTrackPoint } from "../domain/models/TravelSummary";
import { IVehicleGpsDeviceRepository } from "../domain/repositories/mysql/IVehicleGpsDeviceRepository";
import { IVehicleGpsTrackingRepository } from "../domain/repositories/mongo/IVehicleGpsTrackingRepository";
import { AppError } from "../utils/errors";
import { summarizeTravelPoints } from "../utils/travelSummary";
import { IAddVehicleService } from "./interfaces/IAddVehicleService";
import {
  ITravelSummaryService,
  TravelSummaryQuery,
  TravelSummaryRow,
} from "./interfaces/ITravelSummaryService";

@injectable()
export class TravelSummaryService implements ITravelSummaryService {
  constructor(
    @inject("IVehicleGpsDeviceRepository")
    private readonly vehicleRepository: IVehicleGpsDeviceRepository,
    @inject("IVehicleGpsTrackingRepository")
    private readonly trackingRepository: IVehicleGpsTrackingRepository,
    @inject("IAddVehicleService")
    private readonly vehicleService: IAddVehicleService,
  ) {}

  async getTravelSummary(query: TravelSummaryQuery): Promise<TravelSummaryRow[]> {
    if (Number.isNaN(query.from.getTime()) || Number.isNaN(query.to.getTime())) {
      throw new AppError("Invalid from or to datetime", 400);
    }
    if (query.to.getTime() <= query.from.getTime()) {
      throw new AppError("to must be after from", 400);
    }
    if (query.to.getTime() - query.from.getTime() > TRAVEL_SUMMARY_MAX_RANGE_MS) {
      throw new AppError("Date range cannot exceed 31 days", 400);
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
    const reportType = query.reportType ?? ReportType.VEHICLE_WISE;

    let rows: TravelSummaryRow[];
    if (reportType === ReportType.DAY_WISE) {
      rows = [];
      for (const vehicle of vehicles) {
        const detail = this.vehicleService.mapVehicleDetail(vehicle);
        const byDay = groupPointsByDay(pointsByVehicle.get(vehicle.externalId) ?? []);
        const dates = [...byDay.keys()].sort();
        for (const date of dates) {
          rows.push({
            sn: 0,
            ...detail,
            date,
            travel: summarizeTravelPoints(byDay.get(date) ?? []),
          });
        }
      }
    } else {
      rows = vehicles.map((vehicle) => ({
        sn: 0,
        ...this.vehicleService.mapVehicleDetail(vehicle),
        travel: summarizeTravelPoints(pointsByVehicle.get(vehicle.externalId) ?? []),
      }));
    }

    if (query.sortOrder) {
      const direction = query.sortOrder === SortOrder.ASCENDING ? 1 : -1;
      rows.sort((a, b) => {
        const distanceDiff =
          (a.travel.distanceKm - b.travel.distanceKm) * direction;
        if (distanceDiff !== 0) {
          return distanceDiff;
        }
        const dateA = a.date ?? "";
        const dateB = b.date ?? "";
        return dateA.localeCompare(dateB) * direction;
      });
    }

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

function groupPointsByDay(
  points: TravelTrackPoint[],
): Map<string, TravelTrackPoint[]> {
  const grouped = new Map<string, TravelTrackPoint[]>();
  for (const point of points) {
    const key = toLocalDayKey(point.locationTime);
    const rows = grouped.get(key) ?? [];
    rows.push(point);
    grouped.set(key, rows);
  }
  return grouped;
}

function toLocalDayKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
