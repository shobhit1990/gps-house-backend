import { inject, injectable } from "tsyringe";
import { logger } from "../configs/logger";
import { gpsRedisKey } from "../utils/clientNamespace";
import { IRedisService } from "./interfaces/IRedisService";
import {
  IReverseGeocodeService,
  ReverseGeocodeOptions,
  ReverseGeocodeResult,
} from "./interfaces/IReverseGeocodeService";

const DEFAULT_URL = "https://nominatim.openstreetmap.org/reverse";
const DEFAULT_USER_AGENT = "GPSHouse-Backend/1.0";
/** Public Nominatim policy: at most 1 request per second for the whole application. */
const DEFAULT_MIN_INTERVAL_MS = 1_000;
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;
const NEGATIVE_CACHE_TTL_SECONDS = 24 * 60 * 60;
/** After a 429/403 the provider is asking us to slow down — pause all processes. */
const BLOCKED_COOLDOWN_MS = 5 * 60 * 1000;
const SLOT_POLL_MS = 250;

type NominatimReverseResponse = {
  display_name?: string;
  address?: Record<string, string>;
  error?: string;
};

type CachedEntry = ReverseGeocodeResult | { none: true };

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reverse geocoding via Nominatim (public server by default; set GEOCODER_URL to a self-hosted one
 * for higher volume). Coordinates are sent exactly as received (no rounding) and
 * results are cached in Redis per exact coordinate, and a Redis lock enforces the
 * request rate across every PM2 process.
 */
@injectable()
export class ReverseGeocodeService implements IReverseGeocodeService {
  private readonly url = process.env.GEOCODER_URL?.trim() || DEFAULT_URL;
  private readonly userAgent = process.env.GEOCODER_USER_AGENT?.trim() || DEFAULT_USER_AGENT;
  private readonly language = process.env.GEOCODER_LANGUAGE?.trim() || "en";
  private readonly minIntervalMs = envNumber("GEOCODER_MIN_INTERVAL_MS", DEFAULT_MIN_INTERVAL_MS);
  private readonly timeoutMs = envNumber("GEOCODER_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);
  private readonly cacheTtlSeconds = envNumber("GEOCODER_CACHE_TTL_SECONDS", DEFAULT_CACHE_TTL_SECONDS);

  constructor(
    @inject("IRedisService")
    private readonly redisService: IRedisService,
  ) {}

  isEnabled(): boolean {
    return process.env.GEOCODER_ENABLED !== "false";
  }

  async reverse(
    latitude: number,
    longitude: number,
    options: ReverseGeocodeOptions = {},
  ): Promise<ReverseGeocodeResult | null> {
    if (!this.isEnabled() || !isUsableCoordinate(latitude, longitude)) {
      return null;
    }

    // Exact coordinates, no rounding (String() keeps every decimal the device sent).
    const lat = String(latitude);
    const lng = String(longitude);
    // "addr2" = layer=address results with houseNumber; bump when the cached shape/params change.
    const cacheKey = gpsRedisKey("geocode", "addr2", this.language, lat, lng);

    const cached = await this.readCache(cacheKey);
    if (cached) {
      return "none" in cached ? null : cached;
    }

    if (!(await this.acquireSlot(options.waitForSlotMs ?? 0))) {
      return null;
    }

    // Another process may have resolved the same cell while we waited for the slot.
    const cachedAfterWait = await this.readCache(cacheKey);
    if (cachedAfterWait) {
      return "none" in cachedAfterWait ? null : cachedAfterWait;
    }

    const result = await this.fetchFromProvider(lat, lng);
    if (result === undefined) {
      return null; // transient failure: do not cache
    }

    await this.writeCache(
      cacheKey,
      result ?? { none: true },
      result ? this.cacheTtlSeconds : NEGATIVE_CACHE_TTL_SECONDS,
    );
    return result;
  }

  /**
   * @returns result, null when the provider has no address for the point,
   *          or undefined on a transient error (timeout, 5xx, rate limit).
   */
  private async fetchFromProvider(lat: string, lng: string): Promise<ReverseGeocodeResult | null | undefined> {
    const url = new URL(this.url);
    // ?lat=..&lon=..&format=json&accept-language=en&namedetails=1&layer=address
    // layer=address restricts matches to address features (no POIs / natural features).
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lng);
    url.searchParams.set("format", "json");
    url.searchParams.set("accept-language", this.language);
    url.searchParams.set("namedetails", "1");
    url.searchParams.set("layer", "address");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": this.userAgent, Accept: "application/json" },
        signal: controller.signal,
      });

      if (response.status === 429 || response.status === 403) {
        await this.startCooldown();
        logger.warn(`Reverse geocoder refused request (HTTP ${response.status}); pausing lookups`, {
          cooldownMs: BLOCKED_COOLDOWN_MS,
        });
        return undefined;
      }
      if (!response.ok) {
        logger.warn(`Reverse geocoder HTTP ${response.status} for ${lat},${lng}`);
        return undefined;
      }

      const body = (await response.json()) as NominatimReverseResponse;
      const displayName = body.display_name?.trim();
      if (body.error || !displayName) {
        return null;
      }
      const components = body.address ?? null;
      const houseNumber = components?.house_number?.trim() || null;
      return {
        address: withHouseNumber(displayName, houseNumber),
        houseNumber,
        components,
      };
    } catch (error) {
      logger.warn(`Reverse geocoder request failed for ${lat},${lng}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Cluster-wide rate limit: one lookup per minIntervalMs via Redis SET NX PX. */
  private async acquireSlot(waitForSlotMs: number): Promise<boolean> {
    const deadline = Date.now() + Math.max(0, waitForSlotMs);
    const client = this.redisService.getClient();
    const slotKey = gpsRedisKey("geocode", "slot");
    const cooldownKey = gpsRedisKey("geocode", "cooldown");

    for (;;) {
      try {
        if (await client.exists(cooldownKey)) {
          return false;
        }
        const acquired = await client.set(slotKey, "1", "PX", this.minIntervalMs, "NX");
        if (acquired === "OK") {
          return true;
        }
      } catch (error) {
        logger.warn("Reverse geocoder rate-limit check failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        return false;
      }

      if (Date.now() + SLOT_POLL_MS > deadline) {
        return false;
      }
      await sleep(SLOT_POLL_MS);
    }
  }

  private async startCooldown(): Promise<void> {
    try {
      await this.redisService
        .getClient()
        .set(gpsRedisKey("geocode", "cooldown"), "1", "PX", BLOCKED_COOLDOWN_MS);
    } catch {
      // Best effort.
    }
  }

  private async readCache(key: string): Promise<CachedEntry | null> {
    try {
      const raw = await this.redisService.get(key);
      return raw ? (JSON.parse(raw) as CachedEntry) : null;
    } catch {
      return null;
    }
  }

  private async writeCache(key: string, value: CachedEntry, ttlSeconds: number): Promise<void> {
    try {
      await this.redisService.store(key, JSON.stringify(value), ttlSeconds);
    } catch {
      // Cache is an optimisation; ignore failures.
    }
  }
}

/**
 * Ensure the house number (OSM addr:housenumber) leads the address. Nominatim usually puts it
 * first in display_name already; add it only when it is missing so it is never duplicated.
 */
export function withHouseNumber(displayName: string, houseNumber: string | null): string {
  if (!houseNumber) return displayName;
  const parts = displayName.split(",").map((part) => part.trim());
  if (parts.some((part) => part.toLowerCase() === houseNumber.toLowerCase())) {
    return displayName;
  }
  return `${houseNumber}, ${displayName}`;
}

function isUsableCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}
