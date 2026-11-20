import { injectable } from "tsyringe";
import { EntityManager, MongoConnection } from "@mikro-orm/mongodb";
import { CreateCollectionOptions } from "mongodb";
import { IVehicleGpsStatusRepository } from "../../../../domain/repositories/mongo/IVehicleGpsStatusRepository";
import { GpsStatusData } from "../../../../domain/models/GpsTrackingData";
import { GpsStatus } from "../../../../domain/entities/mongo/GpsStatus";
import { logger } from "../../../../configs/logger";
import {
  buildVehicleGpsStatusCollectionName,
  ensureTimeSeriesCollection,
} from "../../../../utils/mongoTimeSeries";

const vehicleStatusTimeSeriesOptions: CreateCollectionOptions = {
  timeseries: {
    timeField: "createdAt",
    granularity: "seconds",
  },
};

@injectable()
export class VehicleGpsStatusRepository implements IVehicleGpsStatusRepository {
  constructor(private readonly em: EntityManager) {}

  private get connection(): MongoConnection {
    return this.em.getConnection() as MongoConnection;
  }

  async createStatus(data: GpsStatusData): Promise<GpsStatus> {
    try {
      if (!data.vehicleId || !data.vehicleNumber) {
        throw new Error(`Vehicle mapping missing for IMEI ${data.deviceImei}`);
      }

      const status = new GpsStatus({
        deviceImei: data.deviceImei,
        vehicleId: data.vehicleId,
        vehicleNumber: data.vehicleNumber,
        terminalInfo: data.terminalInfo,
        oilElectricity: data.oilElectricity,
        gpsTracking: data.gpsTracking,
        alarmStatus: data.alarmStatus,
        alarm: data.alarm,
        charging: data.charging,
        ignition: data.ignition,
        defence: data.defence,
        voltage: data.voltage,
        gsmSignal: data.gsmSignal,
        metadata: data.metadata,
      });

      const collectionName = buildVehicleGpsStatusCollectionName(status.createdAt);
      await ensureTimeSeriesCollection(
        this.connection,
        collectionName,
        vehicleStatusTimeSeriesOptions,
        "vehicleStatus",
      );

      logger.debug(`Persisting GPS status for device ${data.deviceImei} to ${collectionName}...`);
      const collection = this.connection.getCollection<GpsStatus>(collectionName);
      const result = await collection.insertOne(status);
      status._id = result.insertedId;
      logger.debug(`✅ Successfully saved GPS status for device ${data.deviceImei} to ${collectionName}`);

      return status;
    } catch (error) {
      logger.error("Error creating GPS status:", error);
      throw error;
    }
  }

  async findLatestStatus(deviceImei: string): Promise<GpsStatus | null> {
    try {
      const existingCollections = await this.connection.listCollections();
      const collectionNames = existingCollections
        .filter((collectionName) => collectionName.startsWith("vehicleGpsStatus_"))
        .sort()
        .reverse();

      let latest: GpsStatus | null = null;
      for (const collectionName of collectionNames) {
        const collection = this.connection.getCollection<GpsStatus>(collectionName);
        const status = await collection.findOne({ deviceImei }, { sort: { createdAt: -1 } });
        if (!status) {
          continue;
        }

        if (!latest || status.createdAt.getTime() > latest.createdAt.getTime()) {
          latest = status;
        }
      }

      return latest;
    } catch (error) {
      logger.error("Error finding latest GPS status:", error);
      throw error;
    }
  }
}

