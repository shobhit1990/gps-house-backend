import { EntityManager } from "@mikro-orm/mysql";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { GpsTracking } from "../../../domain/entities/mongo/GpsTracking";
import { AddVehicle } from "../../../domain/entities/mysql/AddVehicle";
import { User } from "../../../domain/entities/mysql/User";
import { Hours } from "../../../domain/enums/Hours";
import { LockStatus } from "../../../domain/enums/LockStatus";
import { Status } from "../../../domain/enums/status";
import { IVehicleGpsDeviceRepository } from "../../../domain/repositories/mysql/IVehicleGpsDeviceRepository";
import { IGeofenceService } from "../../../services/interfaces/IGeofenceService";
import { IReverseGeocodeService } from "../../../services/interfaces/IReverseGeocodeService";
import { IVehicleGpsTrackingService } from "../../../services/interfaces/IVehicleGpsTrackingService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { AppError } from "../../../utils/errors";

const DEFAULT_HISTORY_MAX_POINTS = 10_000;
const MAX_SINCE_HOURS = 24 * 31;

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
    @inject("IGeofenceService")
    private readonly geofenceService: IGeofenceService,
    @inject(EntityManager)
    private readonly em: EntityManager,
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
   * Query: vehicleId, from+to OR since (hours), plus optional filter params from the portal modal.
   */
  getHistory = asyncHandler(async (req: Request, res: Response) => {
    const filter = await this.parseHistoryFilter(req);
    const vehicleId = readQuery(req, "vehicleId") ?? readQuery(req, "vehicle");
    const maxPoints = historyMaxPoints();
    const requestedLimit = req.query.limit ? parseInt(String(req.query.limit), 10) : maxPoints;
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : maxPoints;

    if (!vehicleId) throw new AppError("vehicleId is required", 400);

    const vehicle = await this.em.fork().findOne(
      AddVehicle,
      { externalId: vehicleId, isDeleted: false },
      { populate: ["device", "client", "transporter"] },
    );
    if (!vehicle || vehicle.status === Status.INACTIVE) {
      throw new AppError("Vehicle not found", 404);
    }
    if (!vehicleMatchesFilter(vehicle, filter)) {
      throw new AppError("Vehicle does not match the selected filter", 404);
    }

    const points = await this.gpsTrackingService.getLocations({
      vehicleId: vehicle.externalId,
      from: filter.from,
      to: filter.to,
      limit: Math.min(limit, maxPoints),
    });

    const sorted = [...points].sort(
      (a, b) => new Date(a.locationTime).getTime() - new Date(b.locationTime).getTime(),
    );

    const deviceImei = vehicle.device && !vehicle.device.isDeleted ? vehicle.device.imei : undefined;
    const responseImei =
      deviceImei ?? (sorted.length > 0 ? sorted[sorted.length - 1]?.deviceImei : null) ?? null;

    let geofence = null;
    if (filter.enableGeofence && filter.geofenceId) {
      geofence = await this.geofenceService.getGeofenceById(filter.geofenceId);
    }

    res.status(200).json({
      message: "Vehicle history fetched successfully",
      filter: {
        client: filter.clientId ?? null,
        transporter: filter.transporterId ?? null,
        group: filter.groupId ?? null,
        sinceHours: filter.sinceHours ?? null,
        lockStatus: filter.lockStatus ?? null,
        enableGeofence: filter.enableGeofence,
        geofence: filter.geofenceId ?? null,
        from: filter.from.toISOString(),
        to: filter.to.toISOString(),
      },
      data: {
        vehicle: {
          vehicleId: vehicle.externalId,
          vehicleNumber: vehicle.vehicle ?? null,
          deviceImei: responseImei,
          lockStatus: resolveLockStatus(vehicle),
        },
        from: filter.from.toISOString(),
        to: filter.to.toISOString(),
        stats: computeStats(sorted),
        geofenceVisibility: filter.enableGeofence,
        geofence,
        points: sorted.map(serializePoint),
      },
    });
  });

  /**
   * GET /vehicleHistoryTracking/vehicles
   * Vehicles that have a GPS device — for the history dropdown (supports filter modal query params).
   */
  getVehicleList = asyncHandler(async (req: Request, res: Response) => {
    const filter = await this.parseVehicleScopeFilter(req);

    const vehicles = await this.vehicleGpsDeviceRepository.listVehiclesForLiveTracking({
      clientId: filter.groupId ? undefined : filter.clientId,
      transporterId: filter.groupId ? undefined : filter.transporterId,
    });

    const scoped = vehicles.filter(
      (v) => v.device?.imei && !v.device.isDeleted && vehicleMatchesFilter(v, filter),
    );

    res.status(200).json({
      message: "Vehicles fetched successfully",
      filter: {
        client: filter.clientId ?? null,
        transporter: filter.transporterId ?? null,
        group: filter.groupId ?? null,
        lockStatus: filter.lockStatus ?? null,
      },
      data: scoped
        .sort((a, b) => (a.vehicle ?? "").localeCompare(b.vehicle ?? ""))
        .map((v) => ({
          id: v.externalId,
          vehicleNumber: v.vehicle ?? null,
          vehicleNickname: v.vehicleNickname ?? null,
          deviceImei: v.device?.imei ?? null,
          lockStatus: resolveLockStatus(v),
          client: v.client
            ? {
                id: v.client.externalId,
                name: v.client.companyName ?? v.client.name ?? null,
              }
            : null,
          transporter: v.transporter
            ? {
                id: v.transporter.externalId,
                name: v.transporter.companyName ?? v.transporter.name ?? null,
              }
            : null,
        })),
    });
  });

  private async parseHistoryFilter(req: Request): Promise<HistoryFilter> {
    const scope = await this.parseVehicleScopeFilter(req);
    const sinceHours = parseSinceHours(
      readQuery(req, "since") ?? readQuery(req, "sinceHours") ?? readQuery(req, "hours"),
    );
    const fromRaw = readQuery(req, "from") ?? readQuery(req, "startDate");
    const toRaw = readQuery(req, "to") ?? readQuery(req, "endDate");

    let from: Date;
    let to: Date;
    if (sinceHours !== undefined) {
      to = new Date();
      from = new Date(to.getTime() - sinceHours * 60 * 60 * 1000);
    } else {
      if (!fromRaw) throw new AppError("from datetime is required (or pass since hours)", 400);
      if (!toRaw) throw new AppError("to datetime is required (or pass since hours)", 400);
      from = new Date(fromRaw);
      to = new Date(toRaw);
      if (isNaN(from.getTime())) throw new AppError("from is not a valid datetime", 400);
      if (isNaN(to.getTime())) throw new AppError("to is not a valid datetime", 400);
    }
    if (from >= to) throw new AppError("from must be before to", 400);

    const enableGeofence = parseBoolean(
      readQuery(req, "enableGeofence") ??
        readQuery(req, "geofenceVisibility") ??
        readQuery(req, "showGeofence"),
    );
    const geofenceId =
      readQuery(req, "geofence") ?? readQuery(req, "geofenceId") ?? undefined;

    if (enableGeofence && !geofenceId) {
      throw new AppError("geofence is required when geofence visibility is enabled", 400);
    }

    return {
      ...scope,
      sinceHours,
      from,
      to,
      enableGeofence,
      geofenceId: enableGeofence ? geofenceId : undefined,
    };
  }

  private async parseVehicleScopeFilter(req: Request): Promise<VehicleScopeFilter> {
    const groupId = readQuery(req, "group") ?? readQuery(req, "groupId");
    const clientId = readQuery(req, "client") ?? readQuery(req, "clientId");
    const transporterId =
      readQuery(req, "transporter") ?? readQuery(req, "transporterId");
    const lockStatus = parseLockStatus(
      readQuery(req, "lockStatus") ?? readQuery(req, "lock"),
    );

    // UI: Client/Transporter OR Group — group wins when both are sent.
    if (groupId) {
      const groupKeys = await this.resolveGroupMatchKeys(groupId);
      return {
        groupId,
        groupKeys,
        lockStatus,
      };
    }

    return {
      clientId,
      transporterId,
      lockStatus,
    };
  }

  private async resolveGroupMatchKeys(groupId: string): Promise<GroupMatchKeys> {
    const users = await this.em.fork().find(
      User,
      {
        group: { externalId: groupId, isDeleted: false },
        isDeleted: false,
      },
      { populate: ["group"] },
    );
    if (users.length === 0) {
      throw new AppError("Group not found or has no users", 404);
    }

    const userNames = new Set<string>();
    const companyNames = new Set<string>();
    for (const user of users) {
      if (user.userName?.trim()) userNames.add(user.userName.trim().toLowerCase());
      if (user.companyName?.trim()) {
        companyNames.add(user.companyName.trim().toLowerCase());
      }
    }
    return { userNames, companyNames };
  }
}

type GroupMatchKeys = {
  userNames: Set<string>;
  companyNames: Set<string>;
};

type VehicleScopeFilter = {
  clientId?: string;
  transporterId?: string;
  groupId?: string;
  groupKeys?: GroupMatchKeys;
  lockStatus?: LockStatus;
};

type HistoryFilter = VehicleScopeFilter & {
  sinceHours?: number;
  from: Date;
  to: Date;
  enableGeofence: boolean;
  geofenceId?: string;
};

function vehicleMatchesFilter(
  vehicle: AddVehicle,
  filter: VehicleScopeFilter,
): boolean {
  if (filter.groupKeys) {
    const clientUser = vehicle.client?.userName?.trim().toLowerCase() ?? "";
    const clientCompany = vehicle.client?.companyName?.trim().toLowerCase() ?? "";
    const transporterUser = vehicle.transporter?.userName?.trim().toLowerCase() ?? "";
    const transporterCompany =
      vehicle.transporter?.companyName?.trim().toLowerCase() ?? "";
    const inGroup =
      (clientUser && filter.groupKeys.userNames.has(clientUser)) ||
      (transporterUser && filter.groupKeys.userNames.has(transporterUser)) ||
      (clientCompany && filter.groupKeys.companyNames.has(clientCompany)) ||
      (transporterCompany && filter.groupKeys.companyNames.has(transporterCompany));
    if (!inGroup) return false;
  } else {
    if (filter.clientId && vehicle.client?.externalId !== filter.clientId) {
      return false;
    }
    if (
      filter.transporterId &&
      vehicle.transporter?.externalId !== filter.transporterId
    ) {
      return false;
    }
  }

  if (filter.lockStatus) {
    return resolveLockStatus(vehicle) === filter.lockStatus;
  }
  return true;
}

function resolveLockStatus(vehicle: AddVehicle): LockStatus {
  const device = vehicle.device && !vehicle.device.isDeleted ? vehicle.device : null;
  // Protocol: oilElectricity true = oil/electricity disconnected (immobilizer / locked).
  return device?.oilElectricity === true ? LockStatus.LOCKED : LockStatus.UNLOCKED;
}

function parseLockStatus(raw: string | undefined): LockStatus | undefined {
  if (!raw) return undefined;
  const values = Object.values(LockStatus) as string[];
  if (!values.includes(raw)) {
    throw new AppError(`Invalid lockStatus. Use: ${values.join(", ")}`, 400);
  }
  return raw as LockStatus;
}

function parseSinceHours(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const hourValues = Object.values(Hours) as string[];
  if (!hourValues.includes(raw) && !/^\d+(\.\d+)?$/.test(raw)) {
    throw new AppError(
      `Invalid since. Use Hours enum (1-24) or a positive hour count`,
      400,
    );
  }
  const hours = Number(raw);
  if (!Number.isFinite(hours) || hours <= 0 || hours > MAX_SINCE_HOURS) {
    throw new AppError(
      `since must be between 1 and ${MAX_SINCE_HOURS} hours`,
      400,
    );
  }
  return hours;
}

function parseBoolean(raw: string | undefined): boolean {
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function readQuery(req: Request, key: string): string | undefined {
  const value = req.query[key];
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
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
    address: p.address ?? null,
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
