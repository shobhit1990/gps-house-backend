import { inject, injectable } from "tsyringe";
import { SensorReportType } from "../domain/enums/SensorReportType";
import { TRAVEL_SUMMARY_MAX_RANGE_MS } from "../domain/models/TravelSummary";
import { IVehicleGpsDeviceRepository } from "../domain/repositories/mysql/IVehicleGpsDeviceRepository";
import { IVehicleGpsTrackingRepository } from "../domain/repositories/mongo/IVehicleGpsTrackingRepository";
import { AppError } from "../utils/errors";
import {
  buildParkedSensorEvents,
  mapAlarmToSensorType,
  SensorReportEvent,
} from "../utils/sensorReport";
import { IAddVehicleService } from "./interfaces/IAddVehicleService";
import {
  ISensorReportService,
  SensorReportQuery,
  SensorReportRow,
} from "./interfaces/ISensorReportService";

@injectable()
export class SensorReportService implements ISensorReportService {
  constructor(
    @inject("IVehicleGpsDeviceRepository")
    private readonly vehicleRepository: IVehicleGpsDeviceRepository,
    @inject("IVehicleGpsTrackingRepository")
    private readonly trackingRepository: IVehicleGpsTrackingRepository,
    @inject("IAddVehicleService")
    private readonly vehicleService: IAddVehicleService,
  ) {}

  async getSensorReport(query: SensorReportQuery): Promise<SensorReportRow[]> {
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

    const vehicleIds = vehicles.map((vehicle) => vehicle.externalId);
    const allowed = new Set(
      query.reportTypes?.length
        ? query.reportTypes
        : Object.values(SensorReportType),
    );

    const needsParked =
      allowed.has(SensorReportType.PARKED) ||
      allowed.has(SensorReportType.UNPARKED);
    const needsAlarm = [...allowed].some(
      (type) =>
        type !== SensorReportType.PARKED && type !== SensorReportType.UNPARKED,
    );

    const [travelPoints, alarmPoints] = await Promise.all([
      needsParked
        ? this.trackingRepository.findTravelPoints({
            vehicleIds,
            from: query.from,
            to: query.to,
          })
        : Promise.resolve([]),
      needsAlarm
        ? this.trackingRepository.findSensorAlarmPoints({
            vehicleIds,
            from: query.from,
            to: query.to,
          })
        : Promise.resolve([]),
    ]);

    const eventsByVehicle = new Map<string, SensorReportEvent[]>();

    for (const point of alarmPoints) {
      const type =
        mapAlarmToSensorType(point.alarmType) ??
        mapAlarmToSensorType(point.metadata?.sensorType) ??
        mapAlarmToSensorType(point.metadata?.type);
      if (!type || !allowed.has(type)) {
        continue;
      }
      const list = eventsByVehicle.get(point.vehicleId) ?? [];
      list.push({
        vehicleId: point.vehicleId,
        type,
        medium: "Alarm",
        added: point.locationTime,
        address: point.address,
        latitude: Number.isFinite(point.latitude) ? point.latitude : null,
        longitude: Number.isFinite(point.longitude) ? point.longitude : null,
      });
      eventsByVehicle.set(point.vehicleId, list);
    }

    if (needsParked) {
      const travelByVehicle = new Map<string, typeof travelPoints>();
      for (const point of travelPoints) {
        const list = travelByVehicle.get(point.vehicleId) ?? [];
        list.push(point);
        travelByVehicle.set(point.vehicleId, list);
      }
      for (const [vehicleId, points] of travelByVehicle) {
        const parkedEvents = buildParkedSensorEvents(points).filter((event) =>
          allowed.has(event.type),
        );
        if (parkedEvents.length === 0) {
          continue;
        }
        const list = eventsByVehicle.get(vehicleId) ?? [];
        list.push(...parkedEvents);
        eventsByVehicle.set(vehicleId, list);
      }
    }

    const rows: SensorReportRow[] = [];
    for (const vehicle of vehicles) {
      const detail = this.vehicleService.mapVehicleDetail(vehicle);
      const createdByName =
        vehicle.createdBy?.name ??
        vehicle.createdBy?.companyName ??
        vehicle.client?.name ??
        vehicle.client?.companyName ??
        null;
      const events = eventsByVehicle.get(vehicle.externalId) ?? [];
      for (const event of events) {
        rows.push({
          sn: 0,
          ...detail,
          vehicleNo: vehicle.vehicle,
          type: event.type,
          medium: event.medium,
          createdBy: createdByName,
          added: event.added.toISOString(),
          address: event.address,
          latitude: event.latitude,
          longitude: event.longitude,
        });
      }
    }

    rows.sort(
      (a, b) => new Date(a.added).getTime() - new Date(b.added).getTime(),
    );
    return rows.map((row, index) => ({ ...row, sn: index + 1 }));
  }
}
