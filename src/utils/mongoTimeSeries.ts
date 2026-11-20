import type { CreateCollectionOptions } from 'mongodb';
import { MongoConnection } from '@mikro-orm/mongodb';

/**
 * Monthly Mongo time-series collections for vehicle GPS history/status
 * (same naming as dikshank-backend: vehicleGpsTracking_<month>_<year>).
 */

const createdCollections = new Set<string>();

/** Targeted existence check — avoids listing every collection on each write. */
export async function mongoCollectionExists(
  connection: MongoConnection,
  name: string,
): Promise<boolean> {
  if (createdCollections.has(name)) {
    return true;
  }

  const collections = await connection
    .getDb()
    .listCollections({ name }, { nameOnly: true })
    .toArray();
  const exists = collections.length > 0;
  if (exists) {
    createdCollections.add(name);
  }
  return exists;
}

const normalizeDate = (date: Date): Date => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

export function buildMonthlyCollectionName(prefix: string, date: Date): string {
  if (!prefix.trim()) {
    throw new Error('Collection prefix is required');
  }

  const month = date.getUTCMonth() + 1; // 1-12
  const year = date.getUTCFullYear();

  return `${prefix}_${month}_${year}`;
}

/** Lists monthly collection names (prefix_month_year) covering a date range. */
export function listMonthlyCollectionNames(prefix: string, from: Date, to: Date): string[] {
  if (!prefix.trim()) {
    throw new Error('Collection prefix is required');
  }

  if (to.getTime() < from.getTime()) {
    return [];
  }

  const start = normalizeDate(from);
  const end = normalizeDate(to);
  const names = new Set<string>();

  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    names.add(buildMonthlyCollectionName(prefix, cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
  }

  return Array.from(names);
}

export function buildVehicleGpsTrackingCollectionName(date: Date): string {
  return buildMonthlyCollectionName('vehicleGpsTracking', date);
}

export function buildVehicleGpsStatusCollectionName(date: Date): string {
  return buildMonthlyCollectionName('vehicleGpsStatus', date);
}

export function listVehicleGpsTrackingCollectionNames(from: Date, to: Date): string[] {
  return listMonthlyCollectionNames('vehicleGpsTracking', from, to);
}

export function listVehicleGpsStatusCollectionNames(from: Date, to: Date): string[] {
  return listMonthlyCollectionNames('vehicleGpsStatus', from, to);
}

export type MongoTimeSeriesIndexProfile = 'vehicleLocation' | 'vehicleStatus';

export async function ensureTimeSeriesCollection(
  connection: MongoConnection,
  name: string,
  options: CreateCollectionOptions,
  indexProfile: MongoTimeSeriesIndexProfile,
): Promise<void> {
  if (createdCollections.has(name)) {
    return;
  }

  const exists = await mongoCollectionExists(connection, name);
  if (!exists) {
    await connection.getDb().createCollection(name, options);
  }

  // createIndex is idempotent — ensure indexes once per process for new and existing collections.
  const collection = connection.getCollection(name);
  if (indexProfile === 'vehicleLocation') {
    await collection.createIndex({ locationTime: 1 });
    await collection.createIndex({ deviceImei: 1, locationTime: -1 });
    await collection.createIndex({ vehicleId: 1, locationTime: -1 });
    await collection.createIndex({ vehicleNumber: 1, locationTime: -1 });
  } else {
    await collection.createIndex({ createdAt: 1 });
    await collection.createIndex({ deviceImei: 1, createdAt: -1 });
    await collection.createIndex({ vehicleId: 1, createdAt: -1 });
  }

  createdCollections.add(name);
}
