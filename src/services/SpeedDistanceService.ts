import { inject, injectable } from "tsyringe";
import { TRAVEL_SUMMARY_MAX_RANGE_MS } from "../domain/models/TravelSummary";
import { TravelTrackPoint } from "../domain/models/TravelSummary";
import { IVehicleGpsDeviceRepository } from "../domain/repositories/mysql/IVehicleGpsDeviceRepository";
import { IVehicleGpsTrackingRepository } from "../domain/repositories/mongo/IVehicleGpsTrackingRepository";
import { AppError } from "../utils/errors";
import { summarizeSpeedDistance } from "../utils/speedDistance";
import { IAddVehicleService } from "./interfaces/IAddVehicleService";
import {
  ISpeedDistanceService,
  SpeedDistanceQuery,
  SpeedDistanceRow,
} from "./interfaces/ISpeedDistanceService";

@injectable()
export class SpeedDistanceService implements ISpeedDistanceService {
  constructor(
    @inject("IVehicleGpsDeviceRepository")
    private readonly vehicleRepository: IVehicleGpsDeviceRepository,
    @inject("IVehicleGpsTrackingRepository")
    private readonly trackingRepository: IVehicleGpsTrackingRepository,
    @inject("IAddVehicleService")
    private readonly vehicleService: IAddVehicleService,
  ) {}

  async getSpeedDistanceReport(
    query: SpeedDistanceQuery,
  ): Promise<SpeedDistanceRow[]> {
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

    return vehicles.map((vehicle, index) => {
      const stats = summarizeSpeedDistance(
        pointsByVehicle.get(vehicle.externalId) ?? [],
      );
      return {
        sn: index + 1,
        ...this.vehicleService.mapVehicleDetail(vehicle),
        vehicleNo: vehicle.vehicle,
        speedDistance: stats,
        "0-40 kmph": stats.speed0To40Km,
        "40-60 kmph": stats.speed40To60Km,
        "60-80 kmph": stats.speed60To80Km,
        "80+ kmph": stats.speed80PlusKm,
        totalDistanceKms: stats.totalDistanceKm,
      };
    });
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
