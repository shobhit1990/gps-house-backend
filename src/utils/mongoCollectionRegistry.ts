import { MongoConnection } from '@mikro-orm/mongodb';
import { listVehicleGpsTrackingCollectionNames } from './mongoTimeSeries';

const COLLECTION_CACHE_TTL_MS = Math.max(
  5_000,
  Number(process.env.MONGO_COLLECTION_CACHE_TTL_MS || 60_000),
);

type CollectionCacheEntry = {
  names: string[];
  expiresAt: number;
};

const vehicleGpsTrackingCache = new Map<string, CollectionCacheEntry>();

function getCacheKey(prefix: string, from?: Date, to?: Date): string {
  if (!from && !to) {
    return `${prefix}:all`;
  }
  const start = (from ?? to)!.toISOString();
  const end = (to ?? from)!.toISOString();
  return `${prefix}:${start}:${end}`;
}

function readCache(key: string): string[] | null {
  const entry = vehicleGpsTrackingCache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    vehicleGpsTrackingCache.delete(key);
    return null;
  }
  return entry.names;
}

function writeCache(key: string, names: string[]): string[] {
  vehicleGpsTrackingCache.set(key, {
    names,
    expiresAt: Date.now() + COLLECTION_CACHE_TTL_MS,
  });
  return names;
}

/** Cached vehicle GPS tracking collection names for a date range (or all existing). */
export async function getVehicleGpsTrackingCollections(
  connection: MongoConnection,
  from?: Date,
  to?: Date,
): Promise<string[]> {
  if (from || to) {
    const rangeStart = from ?? to!;
    const rangeEnd = to ?? from!;
    const cacheKey = getCacheKey('vehicleGpsTracking', rangeStart, rangeEnd);
    const cached = readCache(cacheKey);
    if (cached) {
      return cached;
    }
    const names = listVehicleGpsTrackingCollectionNames(rangeStart, rangeEnd);
    return writeCache(cacheKey, names);
  }

  const cacheKey = getCacheKey('vehicleGpsTracking');
  const cached = readCache(cacheKey);
  if (cached) {
    return cached;
  }

  const existingCollections = await connection.listCollections();
  const names = existingCollections
    .filter((collectionName) => collectionName.startsWith('vehicleGpsTracking_'))
    .sort()
    .reverse();

  return writeCache(cacheKey, names);
}

/** Invalidate cached collection lists after creating a new monthly collection. */
export function invalidateVehicleGpsTrackingCollectionCache(): void {
  vehicleGpsTrackingCache.clear();
}
