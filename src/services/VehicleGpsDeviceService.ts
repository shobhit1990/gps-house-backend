import { inject, injectable } from "tsyringe";
import { Device } from "../domain/entities/mysql/Device";
import { GpsLocationData, GpsStatusData } from "../domain/models/GpsTrackingData";
import {
  DeviceLiveStatePatch,
  IVehicleGpsDeviceRepository,
} from "../domain/repositories/mysql/IVehicleGpsDeviceRepository";
import { emitVehicleLocationUpdate } from "../infrastructure/socket/socketServer";
import { logger } from "../configs/logger";
import { calculateGuardedGpsDistance, haversineDistanceMeters } from "../utils/gpsDistanceGuard";
import { gpsImeiLookupVariants } from "../utils/gpsImei";
import { advanceGpsDeviceOdometerKm } from "../utils/odometerUtils";
import { IReverseGeocodeService } from "./interfaces/IReverseGeocodeService";
import { IVehicleGpsDeviceResolver } from "./interfaces/IVehicleGpsDeviceResolver";
import { IVehicleGpsDeviceService } from "./interfaces/IVehicleGpsDeviceService";

/** Rows saved before lastFixTime existed: assume the last fix was up to a day before locationTime. */
const LEGACY_FIX_TIME_MARGIN_MS = 24 * 60 * 60 * 1000;
/** Re-geocode the live address only after the vehicle moved this far from where it was resolved. */
const ADDRESS_MIN_MOVE_METERS = Number(process.env.GEOCODER_MIN_MOVE_METERS) || 100;

/**
 * Port of the realtime half of dikshank-backend GpsDeviceService
 * (processLocationRealtime / updateGpsDeviceStatusByImei). The live state lives on `device`.
 */
@injectable()
export class VehicleGpsDeviceService implements IVehicleGpsDeviceService {
  private readonly lastSocketEmitByVehicle = new Map<string, number>();
  private readonly socketEmitMinIntervalMs = Number(process.env.GPS_SOCKET_EMIT_MIN_INTERVAL_MS) || 0;
  /** Device ids with an address lookup in flight (one per device at a time). */
  private readonly addressLookupsInFlight = new Set<number>();

  constructor(
    @inject("IVehicleGpsDeviceRepository")
    private readonly vehicleGpsDeviceRepository: IVehicleGpsDeviceRepository,
    @inject("IVehicleGpsDeviceResolver")
    private readonly vehicleGpsDeviceResolver: IVehicleGpsDeviceResolver,
    @inject("IReverseGeocodeService")
    private readonly reverseGeocodeService: IReverseGeocodeService,
  ) {}

  async processLocationRealtime(deviceImei: string, payload: GpsLocationData): Promise<void> {
    const row = await this.findDevice(deviceImei);
    if (!row) {
      return;
    }

    // Order fixes by the last real GPS fix, not row.locationTime: heartbeats refresh locationTime
    // while ignition is off, which used to drop live packets and blind-area re-uploads (the
    // device's buffered track, sent after reconnect) — leaving the vehicle at a stale position.
    const lastFixTime =
      row.lastFixTime ??
      (row.locationTime ? new Date(row.locationTime.getTime() - LEGACY_FIX_TIME_MARGIN_MS) : undefined);
    if (lastFixTime && payload.locationTime < lastFixTime) {
      return;
    }
    // Time shown on the map must never move backwards (heartbeat may already be newer).
    const isOlderThanRow = Boolean(row.locationTime && payload.locationTime < row.locationTime);

    const previousSpeed = row.speed;
    const distanceDecision = calculateGuardedGpsDistance(
      {
        latitude: toNumber(row.latitude),
        longitude: toNumber(row.longitude),
        locationTime: lastFixTime,
        speed: toNumber(row.speed),
        satellite: row.satellite,
      },
      {
        latitude: payload.latitude,
        longitude: payload.longitude,
        locationTime: payload.locationTime,
        speed: payload.speed,
        satellite: payload.satellite,
      },
    );
    if (!distanceDecision.accepted) {
      logger.warn("GPS distance guard rejected realtime point; accepting location with zero distance", {
        deviceImei,
        reason: distanceDecision.reason,
        distanceMeters: distanceDecision.distanceMeters,
        elapsedSeconds: distanceDecision.elapsedSeconds,
        impliedSpeedKmh: distanceDecision.impliedSpeedKmh,
        previousLocationTime: row.locationTime?.toISOString(),
        locationTime: payload.locationTime.toISOString(),
      });
    }
    const distanceFromLast = distanceDecision.accepted ? distanceDecision.distanceMeters : 0;
    payload.distance = distanceFromLast;
    payload.metadata = {
      ...payload.metadata,
      previousSpeed,
    };

    const patch: DeviceLiveStatePatch = {
      lastFixTime: payload.locationTime,
      latitude: payload.latitude,
      longitude: payload.longitude,
      speed: payload.speed,
      direction: payload.direction,
      gpsRealTime: payload.gpsRealTime,
      gpsPositioning: payload.gpsPositioning,
      mcc: payload.mcc,
      mnc: payload.mnc,
      lac: payload.lac,
      cellId: payload.cellId,
      ignitionStatus: payload.ignitionStatus ?? row.ignitionStatus ?? false,
      distance: distanceFromLast,
      distance1: payload.distance1,
      satellite: payload.satellite,
      latitudeType: payload.latitudeType,
      longitudeType: payload.longitudeType,
      batchId: payload.batchId,
    };
    if (!isOlderThanRow) {
      patch.locationTime = payload.locationTime;
    }
    const odometer = this.nextOdometer(row, distanceFromLast);
    if (odometer != null) {
      patch.odometer = odometer;
      payload.odometer = odometer;
    }

    await this.vehicleGpsDeviceRepository.updateDeviceLiveState(row.id, patch);
    Object.assign(row, patch);

    this.emitVehicleLiveLocation(row, payload.vehicleId, payload.vehicleNumber);
    this.scheduleAddressRefresh(row, payload.vehicleId, payload.vehicleNumber);
  }

  async updateGpsDeviceStatusByImei(deviceImei: string, payload: GpsStatusData): Promise<void> {
    const row = await this.findDevice(deviceImei);
    if (!row) {
      return;
    }

    const patch: DeviceLiveStatePatch = {
      terminalInfo: payload.terminalInfo,
      oilElectricity: payload.oilElectricity,
      gpsTracking: payload.gpsTracking,
      charging: payload.charging,
      ignition: payload.ignition,
      defence: payload.defence,
      voltage: payload.voltage,
      gsmSignal: payload.gsmSignal,
      alarm: payload.alarm,
      alarmStatus: payload.alarmStatus,
    };
    if (payload.ignition === "1" || payload.ignition === "0") {
      patch.ignitionStatus = payload.ignition === "1";
    }

    if (
      typeof payload.latitude === "number" &&
      typeof payload.longitude === "number" &&
      Number.isFinite(payload.latitude) &&
      Number.isFinite(payload.longitude)
    ) {
      const locationTime = payload.locationTime ?? new Date();
      if (!row.locationTime || locationTime >= row.locationTime) {
        const distanceDecision = calculateGuardedGpsDistance(
          {
            latitude: toNumber(row.latitude),
            longitude: toNumber(row.longitude),
            locationTime: row.locationTime,
            speed: toNumber(row.speed),
            satellite: row.satellite,
          },
          {
            latitude: payload.latitude,
            longitude: payload.longitude,
            locationTime,
            speed: payload.speed,
            satellite: payload.satellite,
          },
        );
        if (!distanceDecision.accepted) {
          logger.warn("GPS distance guard rejected realtime status point; accepting location with zero distance", {
            deviceImei,
            reason: distanceDecision.reason,
            distanceMeters: distanceDecision.distanceMeters,
            elapsedSeconds: distanceDecision.elapsedSeconds,
            impliedSpeedKmh: distanceDecision.impliedSpeedKmh,
            previousLocationTime: row.locationTime?.toISOString(),
            locationTime: locationTime.toISOString(),
          });
        }
        const distanceFromLast = distanceDecision.accepted ? distanceDecision.distanceMeters : 0;
        payload.distance = distanceFromLast;
        const vehicleMapping = await this.resolveVehicleMapping(deviceImei, payload);

        Object.assign(patch, {
          locationTime,
          lastFixTime: locationTime,
          latitude: payload.latitude,
          longitude: payload.longitude,
          speed: payload.speed,
          direction: payload.direction,
          gpsRealTime: payload.gpsRealTime,
          gpsPositioning: payload.gpsPositioning,
          mcc: payload.mcc,
          mnc: payload.mnc,
          lac: payload.lac,
          cellId: payload.cellId,
          distance: distanceFromLast,
          distance1: payload.distance1,
          satellite: payload.satellite,
          latitudeType: payload.latitudeType,
          longitudeType: payload.longitudeType,
          batchId: payload.batchId,
        } satisfies DeviceLiveStatePatch);
        const odometer = this.nextOdometer(row, distanceFromLast);
        if (odometer != null) patch.odometer = odometer;

        await this.vehicleGpsDeviceRepository.updateDeviceLiveState(row.id, patch);
        Object.assign(row, patch);
        this.emitVehicleLiveLocation(row, vehicleMapping.vehicleId, vehicleMapping.vehicleNumber);
        this.scheduleAddressRefresh(row, vehicleMapping.vehicleId, vehicleMapping.vehicleNumber);
        return;
      }
    }

    // Pure heartbeat (no lat/lng): while ignition is off, refresh locationTime so the
    // vehicle stays "fresh" when parked — but never apply an older/delayed heartbeat.
    let bumpedLocationTimeFromHeartbeat = false;
    const isIgnitionOff = (patch.ignitionStatus ?? row.ignitionStatus) === false;
    const heartbeatTime =
      payload.locationTime instanceof Date && !Number.isNaN(payload.locationTime.getTime())
        ? payload.locationTime
        : new Date();

    if (isIgnitionOff && (!row.locationTime || heartbeatTime.getTime() > row.locationTime.getTime())) {
      patch.locationTime = heartbeatTime;
      bumpedLocationTimeFromHeartbeat = true;
    }

    await this.vehicleGpsDeviceRepository.updateDeviceLiveState(row.id, patch);
    Object.assign(row, patch);

    if (bumpedLocationTimeFromHeartbeat) {
      const vehicleMapping = await this.resolveVehicleMapping(deviceImei, payload);
      this.emitVehicleLiveLocation(row, vehicleMapping.vehicleId, vehicleMapping.vehicleNumber);
    }
  }

  /** Queue items carry the canonical IMEI; the DB may store a 0-padded variant. */
  private async findDevice(deviceImei: string): Promise<Device | null> {
    for (const variant of gpsImeiLookupVariants(deviceImei)) {
      const row = await this.vehicleGpsDeviceRepository.findDeviceByImei(variant);
      if (row) return row;
    }
    return null;
  }

  private async resolveVehicleMapping(
    deviceImei: string,
    payload: Pick<GpsLocationData | GpsStatusData, "vehicleId" | "vehicleNumber">,
  ): Promise<{ vehicleId?: string; vehicleNumber?: string }> {
    if (payload.vehicleId && payload.vehicleNumber) {
      return { vehicleId: payload.vehicleId, vehicleNumber: payload.vehicleNumber };
    }

    const resolved = await this.vehicleGpsDeviceResolver.resolveDevice(deviceImei);
    if (!resolved.mapped || !resolved.vehicleId) {
      logger.warn(`Skipping vehicle live update for IMEI ${deviceImei}: active vehicle mapping not found`);
      return { vehicleId: payload.vehicleId, vehicleNumber: payload.vehicleNumber };
    }

    payload.vehicleId = resolved.vehicleId;
    payload.vehicleNumber = resolved.vehicleNumber;
    return { vehicleId: resolved.vehicleId, vehicleNumber: resolved.vehicleNumber };
  }

  /**
   * Fire-and-forget: resolve the address for the new live position when the vehicle has moved
   * ADDRESS_MIN_MOVE_METERS from where the stored address was resolved. Never blocks the queue;
   * a lookup skipped because of the geocoder rate limit is retried on the device's next point.
   */
  private scheduleAddressRefresh(
    row: Device,
    vehicleId: string | undefined,
    vehicleNumber: string | undefined,
  ): void {
    if (!this.reverseGeocodeService.isEnabled()) return;

    const latitude = toNumber(row.latitude);
    const longitude = toNumber(row.longitude);
    if (latitude == null || longitude == null || (latitude === 0 && longitude === 0)) return;
    if (this.addressLookupsInFlight.has(row.id)) return;

    const addressLatitude = toNumber(row.addressLatitude);
    const addressLongitude = toNumber(row.addressLongitude);
    if (
      row.address &&
      addressLatitude != null &&
      addressLongitude != null &&
      haversineDistanceMeters(addressLatitude, addressLongitude, latitude, longitude) < ADDRESS_MIN_MOVE_METERS
    ) {
      return;
    }

    this.addressLookupsInFlight.add(row.id);
    void this.reverseGeocodeService
      .reverse(latitude, longitude)
      .then(async (result) => {
        if (!result) return;
        const addressPatch: DeviceLiveStatePatch = {
          address: result.address.slice(0, 500),
          addressLatitude: latitude,
          addressLongitude: longitude,
          addressUpdatedAt: new Date(),
        };
        await this.vehicleGpsDeviceRepository.updateDeviceLiveState(row.id, addressPatch);
        Object.assign(row, addressPatch);
        // Push the address to the map right away (bypasses the per-vehicle socket throttle).
        this.emitVehicleLiveLocation(row, vehicleId, vehicleNumber, true);
      })
      .catch((error) => {
        logger.warn(`Failed to update live address for IMEI ${row.imei}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        this.addressLookupsInFlight.delete(row.id);
      });
  }

  private emitVehicleLiveLocation(
    row: Device,
    vehicleId: string | undefined,
    vehicleNumber: string | undefined,
    force = false,
  ): void {
    if (!vehicleId) {
      return;
    }

    if (!force && this.shouldThrottleSocketEmit(vehicleId)) {
      return;
    }

    emitVehicleLocationUpdate({
      vehicleId,
      vehicleNumber: vehicleNumber ?? null,
      deviceImei: row.imei,
      latitude: toNumber(row.latitude),
      longitude: toNumber(row.longitude),
      speed: toNumber(row.speed),
      direction: toNumber(row.direction),
      ignitionStatus: row.ignitionStatus ?? false,
      locationTime: row.locationTime?.toISOString() ?? null,
      gsmSignal: row.gsmSignal ?? null,
      charging: row.charging ?? null,
      voltage: row.voltage ?? null,
      alarm: row.alarm ?? null,
      terminalInfo: row.terminalInfo ?? null,
      satellite: row.satellite ?? null,
      distance: toNumber(row.distance),
      odometer: toNumber(row.odometer),
      address: row.address ?? null,
    });
  }

  private shouldThrottleSocketEmit(vehicleId: string): boolean {
    if (this.socketEmitMinIntervalMs <= 0) {
      return false;
    }

    const now = Date.now();
    const lastEmitAt = this.lastSocketEmitByVehicle.get(vehicleId) ?? 0;
    if (now - lastEmitAt < this.socketEmitMinIntervalMs) {
      return true;
    }

    this.lastSocketEmitByVehicle.set(vehicleId, now);
    return false;
  }

  /** Cumulative odometer is advanced only here (realtime stage) from guarded GPS distance. */
  private nextOdometer(row: Device, distanceMeters: number): number | null {
    return advanceGpsDeviceOdometerKm({
      currentOdometerKm: toNumber(row.odometer),
      distanceMeters,
    });
  }
}

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
