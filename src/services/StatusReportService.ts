import { inject, injectable } from "tsyringe";
import { TRAVEL_SUMMARY_MAX_RANGE_MS } from "../domain/models/TravelSummary";
import { TravelTrackPoint } from "../domain/models/TravelSummary";
import { IVehicleGpsDeviceRepository } from "../domain/repositories/mysql/IVehicleGpsDeviceRepository";
import { IVehicleGpsTrackingRepository } from "../domain/repositories/mongo/IVehicleGpsTrackingRepository";
import { AppError } from "../utils/errors";
import { buildStatusReportSegments } from "../utils/statusReport";
import { IAddVehicleService } from "./interfaces/IAddVehicleService";
import {
  IStatusReportService,
  StatusReportQuery,
  StatusReportRow,
} from "./interfaces/IStatusReportService";

@injectable()
export class StatusReportService implements IStatusReportService {
  constructor(
    @inject("IVehicleGpsDeviceRepository")
    private readonly vehicleRepository: IVehicleGpsDeviceRepository,
    @inject("IVehicleGpsTrackingRepository")
    private readonly trackingRepository: IVehicleGpsTrackingRepository,
    @inject("IAddVehicleService")
    private readonly vehicleService: IAddVehicleService,
  ) {}

  async getStatusReport(query: StatusReportQuery): Promise<StatusReportRow[]> {
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

    const rows: StatusReportRow[] = [];
    for (const vehicle of vehicles) {
      const detail = this.vehicleService.mapVehicleDetail(vehicle);
      const segments = buildStatusReportSegments(
        pointsByVehicle.get(vehicle.externalId) ?? [],
        {
          overspeedThreshold: Number(vehicle.overspeed) || 0,
          statuses: query.statuses,
        },
      );

      for (const segment of segments) {
        rows.push({
          sn: 0,
          ...detail,
          vehicleNo: vehicle.vehicle,
          status: segment.status,
          startDateTime: segment.startTime.toISOString(),
          startAddress: segment.startAddress,
          startCoordinate: formatCoordinate(
            segment.startLatitude,
            segment.startLongitude,
          ),
          endDateTime: segment.endTime.toISOString(),
          endAddress: segment.endAddress,
          endCoordinate: formatCoordinate(
            segment.endLatitude,
            segment.endLongitude,
          ),
          sPoi: null,
          ePoi: null,
          startLatitude: segment.startLatitude,
          startLongitude: segment.startLongitude,
          endLatitude: segment.endLatitude,
          endLongitude: segment.endLongitude,
        });
      }
    }

    rows.sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() -
        new Date(b.startDateTime).getTime(),
    );
    return rows.map((row, index) => ({ ...row, sn: index + 1 }));
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
