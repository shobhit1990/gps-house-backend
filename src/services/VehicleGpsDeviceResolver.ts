import { inject, injectable } from "tsyringe";
import { Status } from "../domain/enums/status";
import { IVehicleGpsDeviceRepository } from "../domain/repositories/mysql/IVehicleGpsDeviceRepository";
import { logger } from "../configs/logger";
import { IRedisService } from "./interfaces/IRedisService";
import {
  IVehicleGpsDeviceResolver,
  VehicleGpsDeviceResolution,
} from "./interfaces/IVehicleGpsDeviceResolver";
import { gpsImeiLookupVariants, normalizeGpsImei } from "../utils/gpsImei";
import { gpsRedisKey } from "../utils/clientNamespace";

const DEFAULT_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_CACHE_TTL_SECONDS = 10 * 60;
const DEFAULT_NEGATIVE_CACHE_TTL_SECONDS = 5 * 60;

function imeiResolutionKey(deviceImei: string): string {
  return gpsRedisKey("vehicle", "gps", "imei", deviceImei);
}

function imeiResolutionPattern(): string {
  return gpsRedisKey("vehicle", "gps", "imei", "*");
}

/**
 * Resolves a GPS login IMEI to its registered Device and assigned vehicle (AddVehicle),
 * cached in Redis (same flow as dikshank-backend VehicleGpsDeviceResolver).
 */
@injectable()
export class VehicleGpsDeviceResolver implements IVehicleGpsDeviceResolver {
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor(
    @inject("IRedisService")
    private readonly redisService: IRedisService,
    @inject("IVehicleGpsDeviceRepository")
    private readonly vehicleGpsDeviceRepository: IVehicleGpsDeviceRepository,
  ) {}

  async resolveDevice(deviceImei: string): Promise<VehicleGpsDeviceResolution> {
    const variants = gpsImeiLookupVariants(deviceImei);
    if (variants.length === 0) {
      return { registered: false, mapped: false };
    }

    let bestUnmapped: VehicleGpsDeviceResolution | null = null;

    for (const normalizedImei of variants) {
      const cacheKey = imeiResolutionKey(normalizedImei);
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as VehicleGpsDeviceResolution;
        if (parsed.registered && parsed.mapped) {
          return parsed;
        }
        if (parsed.registered && !bestUnmapped) {
          bestUnmapped = parsed;
        }
        continue;
      }

      const resolution = await this.resolveFromDatabase(normalizedImei);
      await this.redisService.store(cacheKey, JSON.stringify(resolution), this.getCacheTtl(resolution));
      if (resolution.registered && resolution.mapped) {
        return resolution;
      }
      if (resolution.registered && !bestUnmapped) {
        bestUnmapped = resolution;
      }
    }

    return bestUnmapped ?? { registered: false, mapped: false };
  }

  async refreshCache(): Promise<void> {
    try {
      const devices = await this.vehicleGpsDeviceRepository.listDevices();
      const vehicles = await this.vehicleGpsDeviceRepository.listVehiclesWithDevice();

      const mappings = new Map<string, VehicleGpsDeviceResolution>();
      for (const device of devices) {
        if (!device.imei || device.status !== Status.ACTIVE) {
          continue;
        }

        mappings.set(device.imei, {
          registered: true,
          mapped: false,
          deviceImei: normalizeGpsImei(device.imei) || device.imei,
        });
      }

      for (const vehicle of vehicles) {
        const device = vehicle.device;
        if (
          !device?.imei ||
          device.isDeleted ||
          device.status !== Status.ACTIVE ||
          !vehicle.vehicle
        ) {
          continue;
        }

        mappings.set(device.imei, {
          registered: true,
          mapped: true,
          deviceImei: normalizeGpsImei(device.imei) || device.imei,
          vehicleId: vehicle.externalId,
          vehicleNumber: vehicle.vehicle,
        });
      }

      await this.redisService.invalidate(imeiResolutionPattern());
      logger.info("Old Vehicle GPS IMEI Redis cache cleared; reloading fresh mappings");
      const cacheEntries = new Map<string, VehicleGpsDeviceResolution>();
      for (const [deviceImei, resolution] of mappings.entries()) {
        for (const variant of gpsImeiLookupVariants(deviceImei)) {
          const existing = cacheEntries.get(variant);
          if (!existing || (resolution.mapped && !existing.mapped)) {
            cacheEntries.set(variant, resolution);
          }
        }
      }

      await Promise.all(
        Array.from(cacheEntries.entries()).map(([variantImei, resolution]) =>
          this.redisService.store(
            imeiResolutionKey(variantImei),
            JSON.stringify(resolution),
            this.getCacheTtl(resolution),
          ),
        ),
      );

      logger.info(`Vehicle GPS IMEI Redis cache refreshed: ${mappings.size} registered IMEI(s)`);
    } catch (error) {
      logger.error("Failed to refresh vehicle GPS IMEI Redis cache", error);
    }
  }

  startCacheRefresh(): void {
    if (this.refreshInterval) {
      return;
    }

    const refreshIntervalMs = this.getRefreshIntervalMs();
    this.refreshCache().catch((error) => {
      logger.error("Initial vehicle GPS IMEI Redis cache refresh failed", error);
    });

    this.refreshInterval = setInterval(() => {
      this.refreshCache().catch((error) => {
        logger.error("Vehicle GPS IMEI Redis cache refresh failed", error);
      });
    }, refreshIntervalMs);

    logger.info(`Vehicle GPS IMEI Redis cache refresh scheduled every ${refreshIntervalMs}ms`);
  }

  private async resolveFromDatabase(deviceImei: string): Promise<VehicleGpsDeviceResolution> {
    const device = await this.vehicleGpsDeviceRepository.findDeviceByImei(deviceImei);

    if (!device || device.status !== Status.ACTIVE) {
      logger.warn(`Skipping GPS device IMEI ${deviceImei}: not registered or inactive`);
      return { registered: false, mapped: false };
    }

    const vehicle = await this.vehicleGpsDeviceRepository.findMappedVehicleByDeviceId(device.id);

    if (!vehicle || !vehicle.vehicle) {
      logger.warn(`Skipping GPS device IMEI ${deviceImei}: no active vehicle mapping found`);
      return { registered: true, mapped: false };
    }

    return {
      registered: true,
      mapped: true,
      deviceImei: normalizeGpsImei(device.imei) || device.imei,
      vehicleId: vehicle.externalId,
      vehicleNumber: vehicle.vehicle,
    };
  }

  private getCacheTtl(resolution: VehicleGpsDeviceResolution): number {
    const ttl = Number(process.env.VEHICLE_GPS_IMEI_CACHE_TTL_SECONDS);
    const negativeTtl = Number(process.env.VEHICLE_GPS_IMEI_NEGATIVE_CACHE_TTL_SECONDS);

    if (resolution.registered && resolution.mapped) {
      return Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_CACHE_TTL_SECONDS;
    }

    return Number.isFinite(negativeTtl) && negativeTtl > 0
      ? negativeTtl
      : DEFAULT_NEGATIVE_CACHE_TTL_SECONDS;
  }

  private getRefreshIntervalMs(): number {
    const intervalMs = Number(process.env.VEHICLE_GPS_IMEI_CACHE_REFRESH_MS);
    return Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : DEFAULT_REFRESH_INTERVAL_MS;
  }
}
