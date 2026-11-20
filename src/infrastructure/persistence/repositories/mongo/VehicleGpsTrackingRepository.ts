import { injectable } from 'tsyringe';
import { EntityManager, MongoConnection } from '@mikro-orm/mongodb';
import { CreateCollectionOptions } from 'mongodb';
import { AppError } from '../../../../utils/errors';
import { GpsLocationData, GpsTrackingQuery } from '../../../../domain/models/GpsTrackingData';
import { TRAVEL_SUMMARY_POINT_CAP, TravelTrackPoint } from '../../../../domain/models/TravelSummary';
import { GpsTracking } from '../../../../domain/entities/mongo/GpsTracking';
import { VehicleGpsTrackingLatestDocument } from '../../../../domain/models/VehicleGpsTrackingLatest';
import { logger } from '../../../../configs/logger';
import { IVehicleGpsTrackingRepository } from '../../../../domain/repositories/mongo/IVehicleGpsTrackingRepository';
import {
  calculateGuardedGpsDistance,
  haversineDistanceMeters,
} from '../../../../utils/gpsDistanceGuard';
import {
  buildVehicleGpsTrackingCollectionName,
  ensureTimeSeriesCollection,
  listVehicleGpsTrackingCollectionNames,
} from '../../../../utils/mongoTimeSeries';
import {
  getVehicleGpsTrackingCollections,
  invalidateVehicleGpsTrackingCollectionCache,
} from '../../../../utils/mongoCollectionRegistry';

const LATEST_COLLECTION = 'vehicleGpsTracking_latest';

/** Ensured once per process so history queries stay indexed on existing monthly shards. */
const vehicleHistoryIndexEnsured = new Set<string>();

const vehicleLocationTimeSeriesOptions: CreateCollectionOptions = {
  timeseries: {
    timeField: 'locationTime',
    granularity: 'seconds',
  },
};

const HISTORY_PROJECTION = {
  deviceImei: 1,
  vehicleId: 1,
  vehicleNumber: 1,
  locationTime: 1,
  latitude: 1,
  longitude: 1,
  speed: 1,
  direction: 1,
  ignitionStatus: 1,
  distance: 1,
  satellite: 1,
  address: 1,
} as const;

const LATEST_LOOKUP_PROJECTION = {
  deviceImei: 1,
  vehicleId: 1,
  vehicleNumber: 1,
  locationTime: 1,
  latitude: 1,
  longitude: 1,
  speed: 1,
  satellite: 1,
  distance: 1,
} as const;

@injectable()
export class VehicleGpsTrackingRepository implements IVehicleGpsTrackingRepository {
  private latestCollectionReady = false;

  constructor(private readonly em: EntityManager) {}

  private get connection(): MongoConnection {
    return this.em.getConnection() as MongoConnection;
  }

  private async ensureLatestCollection(): Promise<void> {
    if (this.latestCollectionReady) {
      return;
    }

    const existing = await this.connection.listCollections();
    if (!existing.includes(LATEST_COLLECTION)) {
      await this.connection.getDb().createCollection(LATEST_COLLECTION);
      invalidateVehicleGpsTrackingCollectionCache();
    }

    const collection = this.connection.getCollection(LATEST_COLLECTION);
    await collection.createIndex({ deviceImei: 1 }, { unique: true });
    await collection.createIndex({ locationTime: -1 });

    this.latestCollectionReady = true;
  }

  private latestDocToTracking(doc: VehicleGpsTrackingLatestDocument): GpsTracking {
    return new GpsTracking({
      deviceImei: doc.deviceImei,
      vehicleId: doc.vehicleId,
      vehicleNumber: doc.vehicleNumber,
      locationTime: doc.locationTime,
      latitude: doc.latitude,
      longitude: doc.longitude,
      speed: doc.speed,
      satellite: doc.satellite,
      distance: doc.distance,
    });
  }

  private async upsertLatestFromTrackings(trackings: GpsTracking[]): Promise<void> {
    if (trackings.length === 0) {
      return;
    }

    await this.ensureLatestCollection();
    const latestByImei = new Map<string, GpsTracking>();
    for (const tracking of trackings) {
      const existing = latestByImei.get(tracking.deviceImei);
      if (!existing || tracking.locationTime.getTime() > existing.locationTime.getTime()) {
        latestByImei.set(tracking.deviceImei, tracking);
      }
    }

    const collection =
      this.connection.getCollection<VehicleGpsTrackingLatestDocument>(LATEST_COLLECTION);
    const now = new Date();

    await Promise.all(
      Array.from(latestByImei.values()).map(async (tracking) => {
        const sourceCollection = buildVehicleGpsTrackingCollectionName(tracking.locationTime);
        const locationTime = tracking.locationTime;

        // Always match by deviceImei only — conditional upsert filters cause E11000 under concurrency.
        await collection.updateOne(
          { deviceImei: tracking.deviceImei },
          [
            {
              $set: {
                isNewerPoint: {
                  $or: [
                    { $eq: [{ $type: '$locationTime' }, 'missing'] },
                    { $lt: ['$locationTime', locationTime] },
                  ],
                },
              },
            },
            {
              $set: {
                deviceImei: tracking.deviceImei,
                vehicleId: { $cond: ['$isNewerPoint', tracking.vehicleId, '$vehicleId'] },
                vehicleNumber: {
                  $cond: ['$isNewerPoint', tracking.vehicleNumber, '$vehicleNumber'],
                },
                locationTime: { $max: ['$locationTime', locationTime] },
                latitude: { $cond: ['$isNewerPoint', tracking.latitude, '$latitude'] },
                longitude: { $cond: ['$isNewerPoint', tracking.longitude, '$longitude'] },
                speed: { $cond: ['$isNewerPoint', tracking.speed ?? null, '$speed'] },
                satellite: { $cond: ['$isNewerPoint', tracking.satellite ?? null, '$satellite'] },
                distance: { $cond: ['$isNewerPoint', tracking.distance ?? null, '$distance'] },
                sourceCollection: { $cond: ['$isNewerPoint', sourceCollection, '$sourceCollection'] },
                updatedAt: { $cond: ['$isNewerPoint', now, '$updatedAt'] },
              },
            },
            { $unset: 'isNewerPoint' },
          ],
          { upsert: true },
        );
      }),
    );
  }

  /**
   * Calculate distance from last location stored in dynamic monthly vehicle collections.
   * Returns distance in meters
   */
  private async calculateDistanceFromLast(
    deviceImei: string,
    current: GpsLocationData,
  ): Promise<number> {
    try {
      const lastLocation = await this.findLatestLocationBefore(deviceImei, current.locationTime);
      if (lastLocation?.latitude == null || lastLocation.longitude == null) {
        return 0;
      }

      const decision = calculateGuardedGpsDistance(
        {
          latitude: lastLocation.latitude,
          longitude: lastLocation.longitude,
          locationTime: lastLocation.locationTime,
          speed: lastLocation.speed,
          satellite: lastLocation.satellite,
        },
        {
          latitude: current.latitude,
          longitude: current.longitude,
          locationTime: current.locationTime,
          speed: current.speed,
          satellite: current.satellite,
        },
      );
      if (!decision.accepted) {
        logger.warn('GPS history distance guard rejected point; saving with zero distance', {
          deviceImei,
          reason: decision.reason,
          elapsedSeconds: decision.elapsedSeconds,
          impliedSpeedKmh: decision.impliedSpeedKmh,
          locationTime: current.locationTime.toISOString(),
        });
        return 0;
      }
      return decision.distanceMeters;
    } catch (error) {
      logger.warn(`Failed to calculate distance for device ${deviceImei}:`, error);
      return 0;
    }
  }

  async createLocation(data: GpsLocationData): Promise<GpsTracking> {
    try {
      if (!data.vehicleId || !data.vehicleNumber) {
        throw new Error(`Vehicle mapping missing for IMEI ${data.deviceImei}`);
      }

      let calculatedDistance = data.distance || 0;
      if (!calculatedDistance) {
        const distanceFromLast = await this.calculateDistanceFromLast(data.deviceImei, data);
        if (distanceFromLast > 0) {
          calculatedDistance = distanceFromLast;
        }
      }

      const tracking = new GpsTracking({
        deviceImei: data.deviceImei,
        vehicleId: data.vehicleId,
        vehicleNumber: data.vehicleNumber,
        locationTime: data.locationTime,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed,
        gpsRealTime: data.gpsRealTime,
        gpsPositioning: data.gpsPositioning,
        direction: data.direction,
        mcc: data.mcc,
        mnc: data.mnc,
        lac: data.lac,
        cellId: data.cellId,
        ignitionStatus: data.ignitionStatus,
        distance: calculatedDistance,
        distance1: data.distance1,
        satellite: data.satellite,
        latitudeType: data.latitudeType,
        longitudeType: data.longitudeType,
        batchId: data.batchId,
        address: data.address,
        metadata: data.metadata,
      });

      await this.insertLocations([tracking]);

      return tracking;
    } catch (error) {
      logger.error('Error creating GPS location:', error);
      throw error;
    }
  }

  async createLocations(data: GpsLocationData[]): Promise<GpsTracking[]> {
    try {
      const deviceGroups = new Map<string, GpsLocationData[]>();
      for (const item of data) {
        if (!item.vehicleId || !item.vehicleNumber) {
          logger.warn(`Skipping GPS location for IMEI ${item.deviceImei}: vehicle mapping missing`);
          continue;
        }

        if (!deviceGroups.has(item.deviceImei)) {
          deviceGroups.set(item.deviceImei, []);
        }
        deviceGroups.get(item.deviceImei)!.push(item);
      }

      const lastLocationsMap = new Map<string, GpsTracking | null>();
      for (const [deviceImei, items] of deviceGroups.entries()) {
        const firstLocationTime = items.reduce<Date | null>((oldest, item) => {
          if (!oldest || item.locationTime.getTime() < oldest.getTime()) {
            return item.locationTime;
          }
          return oldest;
        }, null);
        const lastLocation = firstLocationTime
          ? await this.findLatestLocationBefore(deviceImei, firstLocationTime)
          : null;
        lastLocationsMap.set(deviceImei, lastLocation);
      }

      const trackings: GpsTracking[] = [];
      for (const [deviceImei, items] of deviceGroups.entries()) {
        const lastLocation = lastLocationsMap.get(deviceImei);
        let currentLat = lastLocation?.latitude || 0;
        let currentLon = lastLocation?.longitude || 0;
        let currentLocationTime = lastLocation?.locationTime;
        let currentSpeed = lastLocation?.speed;
        let currentSatellite = lastLocation?.satellite;
        const sortedItems = [...items].sort(
          (a, b) => a.locationTime.getTime() - b.locationTime.getTime(),
        );

        for (const item of sortedItems) {
          const vehicleId = item.vehicleId;
          const vehicleNumber = item.vehicleNumber;
          if (!vehicleId || !vehicleNumber) {
            logger.warn(
              `Skipping GPS location for IMEI ${item.deviceImei}: vehicle mapping missing`,
            );
            continue;
          }

          let calculatedDistance = item.distance || 0;

          if (currentLat > 0 && currentLon > 0) {
            const decision = calculateGuardedGpsDistance(
              {
                latitude: currentLat,
                longitude: currentLon,
                locationTime: currentLocationTime,
                speed: currentSpeed,
                satellite: currentSatellite,
              },
              {
                latitude: item.latitude,
                longitude: item.longitude,
                locationTime: item.locationTime,
                speed: item.speed,
                satellite: item.satellite,
              },
            );
            if (!decision.accepted) {
              logger.warn('GPS history distance guard rejected point; saving with zero distance', {
                deviceImei: item.deviceImei,
                reason: decision.reason,
                elapsedSeconds: decision.elapsedSeconds,
                impliedSpeedKmh: decision.impliedSpeedKmh,
                locationTime: item.locationTime.toISOString(),
              });
              calculatedDistance = 0;
            } else {
              calculatedDistance = decision.distanceMeters;
            }
          } else if (!calculatedDistance) {
            const distanceFromLast = await this.calculateDistanceFromLast(deviceImei, item);
            calculatedDistance = distanceFromLast;
          }

          const tracking = new GpsTracking({
            deviceImei: item.deviceImei,
            vehicleId,
            vehicleNumber,
            locationTime: item.locationTime,
            latitude: item.latitude,
            longitude: item.longitude,
            speed: item.speed,
            gpsRealTime: item.gpsRealTime,
            gpsPositioning: item.gpsPositioning,
            direction: item.direction,
            mcc: item.mcc,
            mnc: item.mnc,
            lac: item.lac,
            cellId: item.cellId,
            ignitionStatus: item.ignitionStatus,
            distance: calculatedDistance,
            distance1: item.distance1,
            satellite: item.satellite,
            latitudeType: item.latitudeType,
            longitudeType: item.longitudeType,
            batchId: item.batchId,
            address: item.address,
            metadata: item.metadata,
          });

          trackings.push(tracking);

          currentLat = item.latitude;
          currentLon = item.longitude;
          currentLocationTime = item.locationTime;
          currentSpeed = item.speed;
          currentSatellite = item.satellite;
        }
      }

      if (trackings.length === 0) {
        logger.warn('No trackings to persist - trackings array is empty');
        return [];
      }

      logger.info(`Persisting ${trackings.length} GPS tracking record(s) to MongoDB...`);
      try {
        await this.insertLocations(trackings);
        logger.info(
          `✅ Successfully saved ${trackings.length} GPS tracking record(s) to MongoDB for device(s): ${[...new Set(trackings.map((t) => t.deviceImei))].join(', ')}`,
        );
      } catch (flushError) {
        logger.error(`❌ Failed to flush GPS tracking records to MongoDB:`, flushError);
        throw flushError;
      }

      return trackings;
    } catch (error) {
      logger.error('Error creating GPS locations:', error);
      throw error;
    }
  }

  async findLocations(query: GpsTrackingQuery): Promise<GpsTracking[]> {
    try {
      const filter: Record<string, unknown> = {};
      const from = query.from
        ? query.from instanceof Date
          ? query.from
          : new Date(query.from)
        : undefined;
      const to = query.to ? (query.to instanceof Date ? query.to : new Date(query.to)) : undefined;

      const vehicleId = query.vehicleId?.trim();
      const vehicleNumber = query.vehicleNumber?.trim();
      if (vehicleId) {
        filter.vehicleId = vehicleId;
      } else if (vehicleNumber) {
        filter.vehicleNumber = vehicleNumber;
      } else if (query.deviceImei) {
        filter.deviceImei = query.deviceImei;
      }

      // Preserve legacy default: only moving points unless explicitly disabled.
      if (query.movingOnly !== false) {
        filter.speed = { $gt: 0 };
      }

      if (from || to) {
        const locationTimeFilter: Record<string, Date> = {};
        if (from) {
          locationTimeFilter.$gte = from;
        }
        if (to) {
          locationTimeFilter.$lte = to;
        }
        filter.locationTime = locationTimeFilter;
      }

      const limit = Math.max(1, query.limit ?? 10_000);
      const skip = Math.max(0, query.skip ?? 0);
      const collectionNames = await this.resolveCollectionNames(from, to);
      const existingCollections = new Set(await this.connection.listCollections());

      // Legacy behaviour: newest points first, then ascending order for playback.
      const reverseChronologicalNames = [...collectionNames].sort().reverse();
      const merged: GpsTracking[] = [];

      for (const collectionName of reverseChronologicalNames) {
        if (!existingCollections.has(collectionName)) {
          continue;
        }
        if (merged.length >= limit + skip) {
          break;
        }

        const collection = this.connection.getCollection<GpsTracking>(collectionName);
        if ((vehicleId || vehicleNumber) && !vehicleHistoryIndexEnsured.has(collectionName)) {
          await collection.createIndex({ vehicleId: 1, locationTime: -1 });
          await collection.createIndex({ vehicleNumber: 1, locationTime: -1 });
          vehicleHistoryIndexEnsured.add(collectionName);
        }
        const need = limit + skip - merged.length;
        const docs = await collection
          .find(filter)
          .sort({ locationTime: -1 })
          .limit(need)
          .project(HISTORY_PROJECTION)
          .toArray();

        merged.push(...(docs as GpsTracking[]));
      }

      merged.sort((a, b) => b.locationTime.getTime() - a.locationTime.getTime());
      const page = merged.slice(skip, skip + limit);
      page.sort((a, b) => a.locationTime.getTime() - b.locationTime.getTime());
      return page;
    } catch (error) {
      logger.error('Error finding GPS locations:', error);
      throw error;
    }
  }

  async findLatestLocations(recordedAfter?: Date): Promise<VehicleGpsTrackingLatestDocument[]> {
    try {
      await this.ensureLatestCollection();
      const collection =
        this.connection.getCollection<VehicleGpsTrackingLatestDocument>(LATEST_COLLECTION);
      const filter: Record<string, unknown> = {};
      if (recordedAfter) {
        filter.locationTime = { $gte: recordedAfter };
      }
      return (await collection
        .find(filter)
        .project({
          deviceImei: 1,
          vehicleId: 1,
          vehicleNumber: 1,
          locationTime: 1,
          latitude: 1,
          longitude: 1,
        })
        .toArray()) as VehicleGpsTrackingLatestDocument[];
    } catch (error) {
      logger.warn('Failed to load latest vehicle GPS positions for nearby member detection', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  async findLatestLocation(deviceImei: string): Promise<GpsTracking | null> {
    try {
      await this.ensureLatestCollection();
      const latestCollection =
        this.connection.getCollection<VehicleGpsTrackingLatestDocument>(LATEST_COLLECTION);
      const cached = await latestCollection.findOne({ deviceImei });
      if (cached) {
        return this.latestDocToTracking(cached);
      }

      return await this.findLatestLocationInCollections(
        deviceImei,
        await this.resolveCollectionNames(),
      );
    } catch (error) {
      logger.error('Error finding latest GPS location:', error);
      throw error;
    }
  }

  private async findLatestLocationInCollections(
    deviceImei: string,
    collectionNames: string[],
  ): Promise<GpsTracking | null> {
    let latest: GpsTracking | null = null;

    for (const collectionName of collectionNames) {
      const collection = this.connection.getCollection<GpsTracking>(collectionName);
      const location = await collection.findOne(
        { deviceImei },
        { sort: { locationTime: -1 }, projection: LATEST_LOOKUP_PROJECTION },
      );
      if (!location) {
        continue;
      }

      if (!latest || location.locationTime.getTime() > latest.locationTime.getTime()) {
        latest = location as GpsTracking;
      }
    }

    return latest;
  }

  private async findLatestLocationBeforeInCollections(
    deviceImei: string,
    before: Date,
    collectionNames: string[],
  ): Promise<GpsTracking | null> {
    let latest: GpsTracking | null = null;

    for (const collectionName of collectionNames) {
      const collection = this.connection.getCollection<GpsTracking>(collectionName);
      const location = await collection.findOne(
        {
          deviceImei,
          locationTime: { $lt: before },
        },
        { sort: { locationTime: -1 }, projection: LATEST_LOOKUP_PROJECTION },
      );
      if (!location) {
        continue;
      }

      if (!latest || location.locationTime.getTime() > latest.locationTime.getTime()) {
        latest = location as GpsTracking;
      }
    }

    return latest;
  }

  private async findLatestLocationBefore(
    deviceImei: string,
    before: Date,
  ): Promise<GpsTracking | null> {
    try {
      await this.ensureLatestCollection();
      const latestCollection =
        this.connection.getCollection<VehicleGpsTrackingLatestDocument>(LATEST_COLLECTION);
      const cached = await latestCollection.findOne({ deviceImei });

      if (cached && cached.locationTime.getTime() < before.getTime()) {
        return this.latestDocToTracking(cached);
      }

      // Fast path: current + previous month only (covers live ingest and queue backlog).
      const rangeStart = new Date(before);
      rangeStart.setUTCMonth(rangeStart.getUTCMonth() - 1);
      rangeStart.setUTCDate(1);
      const boundedNames = listVehicleGpsTrackingCollectionNames(rangeStart, before);
      const boundedLatest = await this.findLatestLocationBeforeInCollections(
        deviceImei,
        before,
        boundedNames,
      );
      if (boundedLatest) {
        return boundedLatest;
      }

      // Safety net: preserve legacy behaviour for long-idle devices / historical replay.
      return await this.findLatestLocationBeforeInCollections(
        deviceImei,
        before,
        await this.resolveCollectionNames(),
      );
    } catch (error) {
      logger.error('Error finding previous GPS location:', error);
      throw error;
    }
  }

  async findTravelPoints(query: {
    vehicleIds: string[];
    from: Date;
    to: Date;
    limit?: number;
  }): Promise<TravelTrackPoint[]> {
    const vehicleIds = [...new Set(query.vehicleIds.map((id) => id.trim()).filter(Boolean))];
    if (vehicleIds.length === 0) {
      return [];
    }

    const cap = Math.max(1, query.limit ?? TRAVEL_SUMMARY_POINT_CAP);
    const collectionNames = await this.resolveCollectionNames(query.from, query.to);
    const existingCollections = new Set(await this.connection.listCollections());
    const points: TravelTrackPoint[] = [];

    for (const collectionName of collectionNames) {
      if (!existingCollections.has(collectionName) || points.length >= cap) {
        continue;
      }
      const collection = this.connection.getCollection<GpsTracking>(collectionName);
      if (!vehicleHistoryIndexEnsured.has(collectionName)) {
        await collection.createIndex({ vehicleId: 1, locationTime: -1 });
        vehicleHistoryIndexEnsured.add(collectionName);
      }
      const docs = await collection
        .find({
          vehicleId: { $in: vehicleIds },
          locationTime: { $gte: query.from, $lte: query.to },
        })
        .sort({ locationTime: 1 })
        .limit(cap - points.length)
        .project(HISTORY_PROJECTION)
        .toArray();

      for (const doc of docs) {
        points.push({
          vehicleId: String(doc.vehicleId),
          locationTime:
            doc.locationTime instanceof Date ? doc.locationTime : new Date(doc.locationTime),
          latitude: Number(doc.latitude),
          longitude: Number(doc.longitude),
          speed: Number(doc.speed ?? 0),
          ignitionStatus: Boolean(doc.ignitionStatus),
          distance: Number(doc.distance ?? 0),
          address: doc.address ?? null,
        });
      }
    }

    if (points.length >= cap) {
      throw new AppError(
        "Date range has too many GPS points. Narrow the client, transporter, vehicle, or dates.",
        400,
      );
    }

    return points;
  }

  async sumDistanceByDeviceImeis(query: {
    deviceImeis: string[];
    from: Date;
    to: Date;
  }): Promise<Record<string, number>> {
    const deviceImeis = query.deviceImeis
      .map((imei) => imei.trim())
      .filter((imei) => imei.length > 0);
    if (deviceImeis.length === 0) return {};

    const collectionNames = await this.resolveCollectionNames(query.from, query.to);
    const existingCollections = new Set(await this.connection.listCollections());
    const totals: Record<string, number> = {};

    for (const collectionName of collectionNames) {
      if (!existingCollections.has(collectionName)) continue;
      const collection = this.connection.getCollection<GpsTracking>(collectionName);
      const rows = await collection
        .aggregate<{ _id: string; totalDistanceMeters: number }>([
          {
            $match: {
              deviceImei: { $in: deviceImeis },
              locationTime: { $gte: query.from, $lte: query.to },
            },
          },
          {
            $group: {
              _id: '$deviceImei',
              totalDistanceMeters: { $sum: { $ifNull: ['$distance', 0] } },
            },
          },
        ])
        .toArray();

      for (const row of rows) {
        totals[row._id] = (totals[row._id] ?? 0) + Number(row.totalDistanceMeters || 0);
      }
    }

    return totals;
  }

  private async insertLocations(trackings: GpsTracking[]): Promise<void> {
    const groups = new Map<string, GpsTracking[]>();
    for (const tracking of trackings) {
      const collectionName = buildVehicleGpsTrackingCollectionName(tracking.locationTime);
      if (!groups.has(collectionName)) {
        groups.set(collectionName, []);
      }
      groups.get(collectionName)!.push(tracking);
    }

    for (const [collectionName, docs] of groups.entries()) {
      const collectionExisted = (await this.connection.listCollections()).includes(collectionName);
      await ensureTimeSeriesCollection(
        this.connection,
        collectionName,
        vehicleLocationTimeSeriesOptions,
        'vehicleLocation',
      );
      if (!collectionExisted) {
        invalidateVehicleGpsTrackingCollectionCache();
      }

      const collection = this.connection.getCollection<GpsTracking>(collectionName);
      const result =
        docs.length === 1 ? await collection.insertOne(docs[0]) : await collection.insertMany(docs);

      if ('insertedId' in result) {
        docs[0]._id = result.insertedId;
      } else {
        docs.forEach((doc, index) => {
          doc._id = result.insertedIds[index];
        });
      }
    }

    try {
      await this.upsertLatestFromTrackings(trackings);
    } catch (error) {
      logger.warn('Failed to upsert vehicleGpsTracking_latest; GPS history points were saved', {
        error: error instanceof Error ? error.message : String(error),
        deviceImeis: [...new Set(trackings.map((tracking) => tracking.deviceImei))],
      });
    }
  }

  private calculateHaversineDistance(
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number,
  ): number {
    return haversineDistanceMeters(fromLat, fromLon, toLat, toLon);
  }

  private async resolveCollectionNames(from?: Date, to?: Date): Promise<string[]> {
    return getVehicleGpsTrackingCollections(this.connection, from, to);
  }
}
