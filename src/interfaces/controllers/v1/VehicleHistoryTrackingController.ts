import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { GpsTracking } from "../../../domain/entities/mongo/GpsTracking";
import { Status } from "../../../domain/enums/status";
import { IVehicleGpsDeviceRepository } from "../../../domain/repositories/mysql/IVehicleGpsDeviceRepository";
import { IVehicleGpsTrackingService } from "../../../services/interfaces/IVehicleGpsTrackingService";
import { IReverseGeocodeService } from "../../../services/interfaces/IReverseGeocodeService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { AppError } from "../../../utils/errors";

const DEFAULT_HISTORY_MAX_POINTS = 10_000;

function historyMaxPoints(): number {
  const value = Number(process.env.GPS_HISTORY_MAX_POINTS);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_HISTORY_MAX_POINTS;
}

@injectable()
export class VehicleHistoryTrackingController {
  constructor(
    @inject("IVehicleGpsDeviceRepository")
    private readonly vehicleGpsDeviceRepository: IVehicleGpsDeviceRepository,
    @inject("IVehicleGpsTrackingService")
    private readonly gpsTrackingService: IVehicleGpsTrackingService,
    @inject("IReverseGeocodeService")
    private readonly reverseGeocodeService: IReverseGeocodeService,
  ) {}

  /**
   * GET /vehicleHistoryTracking/address?lat=&lng=
   * On-demand address for one point (e.g. a clicked history marker). Cached; shares the
   * geocoder rate limit with the live pipeline and waits up to 3 s for a free slot.
   */
  getAddress = asyncHandler(async (req: Request, res: Response) => {
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lng);
    if (
      req.query.lat === undefined ||
      req.query.lng === undefined ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    ) {
      throw new AppError("lat and lng must be valid coordinates", 400);
    }
    if (!this.reverseGeocodeService.isEnabled()) {
      throw new AppError("Address lookup is disabled", 503);
    }

    const result = await this.reverseGeocodeService.reverse(latitude, longitude, {
      waitForSlotMs: 3_000,
    });

    res.status(200).json({
      message: result ? "Address fetched successfully" : "Address not available right now",
      data: {
        lat: latitude,
        lng: longitude,
        address: result?.address ?? null,
        houseNumber: result?.houseNumber ?? null,
        components: result?.components ?? null,
      },
    });
  });

  /**
   * GET /vehicleHistoryTracking/history
   * Query: vehicleId, from (ISO), to (ISO), limit?
   */
  getHistory = asyncHandler(async (req: Request, res: Response) => {
    const vehicleId = req.query.vehicleId ? String(req.query.vehicleId) : undefined;
    const fromStr = req.query.from ? String(req.query.from) : undefined;
    const toStr = req.query.to ? String(req.query.to) : undefined;
    const maxPoints = historyMaxPoints();
    const requestedLimit = req.query.limit ? parseInt(String(req.query.limit), 10) : maxPoints;
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : maxPoints;

    if (!vehicleId) throw new AppError("vehicleId is required", 400);
    if (!fromStr) throw new AppError("from datetime is required", 400);
    if (!toStr) throw new AppError("to datetime is required", 400);

    const from = new Date(fromStr);
    const to = new Date(toStr);
    if (isNaN(from.getTime())) throw new AppError("from is not a valid datetime", 400);
    if (isNaN(to.getTime())) throw new AppError("to is not a valid datetime", 400);
    if (from >= to) throw new AppError("from must be before to", 400);

    const vehicle = await this.vehicleGpsDeviceRepository.findVehicleByExternalId(vehicleId);
    if (!vehicle || vehicle.status === Status.INACTIVE) {
      throw new AppError("Vehicle not found", 404);
    }

    // Query Mongo by vehicleId so history survives GPS / IMEI swaps.
    const points = await this.gpsTrackingService.getLocations({
      vehicleId: vehicle.externalId,
      from,
      to,
      limit: Math.min(limit, maxPoints),
    });

    const sorted = [...points].sort(
      (a, b) => new Date(a.locationTime).getTime() - new Date(b.locationTime).getTime(),
    );

    const deviceImei = vehicle.device && !vehicle.device.isDeleted ? vehicle.device.imei : undefined;
    const responseImei =
      deviceImei ?? (sorted.length > 0 ? sorted[sorted.length - 1]?.deviceImei : null) ?? null;

    res.status(200).json({
      message: "Vehicle history fetched successfully",
      data: {
        vehicle: {
          vehicleId: vehicle.externalId,
          vehicleNumber: vehicle.vehicle ?? null,
          deviceImei: responseImei,
        },
        from: from.toISOString(),
        to: to.toISOString(),
        stats: computeStats(sorted),
        points: sorted.map(serializePoint),
      },
    });
  });

  /**
   * GET /vehicleHistoryTracking/vehicles
   * Vehicles that have a GPS device — for the history dropdown.
   */
  getVehicleList = asyncHandler(async (_req: Request, res: Response) => {
    const vehicles = await this.vehicleGpsDeviceRepository.listVehiclesWithDevice();
    const withGps = vehicles.filter((v) => v.device?.imei && !v.device.isDeleted);

    res.status(200).json({
      message: "Vehicles fetched successfully",
      data: withGps
        .sort((a, b) => (a.vehicle ?? "").localeCompare(b.vehicle ?? ""))
        .map((v) => ({
          id: v.externalId,
          vehicleNumber: v.vehicle ?? null,
          vehicleNickname: v.vehicleNickname ?? null,
          deviceImei: v.device?.imei ?? null,
        })),
    });
  });
}

/* ── helpers (same shape as dikshank-backend) ── */
function serializePoint(p: GpsTracking) {
  return {
    lat: Number(p.latitude),
    lng: Number(p.longitude),
    speed: p.speed ?? 0,
    direction: p.direction ?? 0,
    locationTime: p.locationTime instanceof Date ? p.locationTime.toISOString() : p.locationTime,
    ignitionStatus: p.ignitionStatus ?? false,
    distance: p.distance ?? 0,
    satellite: p.satellite ?? null,
  };
}

function computeStats(points: GpsTracking[]) {
  if (points.length === 0) {
    return { totalPoints: 0, totalDistanceMeters: 0, maxSpeed: 0, avgSpeed: 0, durationMs: 0 };
  }
  const speeds = points.map((p) => p.speed ?? 0).filter((s) => s > 0);
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
  const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
  const totalDistanceMeters = points.reduce((sum, p) => sum + Number(p.distance ?? 0), 0);
  const durationMs =
    points.length < 2
      ? 0
      : new Date(points[points.length - 1].locationTime).getTime() -
        new Date(points[0].locationTime).getTime();

  return {
    totalPoints: points.length,
    totalDistanceMeters: Math.round(totalDistanceMeters * 100) / 100,
    maxSpeed: Math.round(maxSpeed * 10) / 10,
    avgSpeed: Math.round(avgSpeed * 10) / 10,
    durationMs,
  };
}
