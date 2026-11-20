import { inject, injectable } from "tsyringe";
import { IVehicleGpsTrackingService } from "./interfaces/IVehicleGpsTrackingService";
import { IVehicleGpsTrackingRepository } from "../domain/repositories/mongo/IVehicleGpsTrackingRepository";
import { IVehicleGpsStatusRepository } from "../domain/repositories/mongo/IVehicleGpsStatusRepository";
import { GpsLocationData, GpsStatusData, GpsTrackingQuery } from "../domain/models/GpsTrackingData";
import { GpsTracking } from "../domain/entities/mongo/GpsTracking";
import { logger } from "../configs/logger";

@injectable()
export class VehicleGpsTrackingService implements IVehicleGpsTrackingService {
  constructor(
    @inject("IVehicleGpsTrackingRepository")
    private readonly gpsTrackingRepository: IVehicleGpsTrackingRepository,
    @inject("IVehicleGpsStatusRepository")
    private readonly vehicleGpsStatusRepository: IVehicleGpsStatusRepository,
  ) {}

  async recordLocation(data: GpsLocationData): Promise<void> {
    try {
      await this.gpsTrackingRepository.createLocation(data);
      logger.debug(`GPS location recorded for device: ${data.deviceImei}`);
    } catch (error) {
      logger.error(`Error recording GPS location for device ${data.deviceImei}:`, error);
      throw error;
    }
  }

  async recordLocations(data: GpsLocationData[]): Promise<GpsTracking[]> {
    try {
      if (data.length === 0) {
        return [];
      }

      const trackings = await this.gpsTrackingRepository.createLocations(data);
      logger.info(
        `GPS locations saved to MongoDB: ${trackings.length}/${data.length} records for devices: ${[
          ...new Set(data.map((d) => d.deviceImei)),
        ].join(", ")}`,
      );
      return trackings;
    } catch (error) {
      logger.error(`Error recording GPS locations:`, error);
      throw error;
    }
  }

  async recordStatus(data: GpsStatusData): Promise<void> {
    try {
      await this.vehicleGpsStatusRepository.createStatus(data);
      logger.info(`GPS status saved to MongoDB for device: ${data.deviceImei}`);
    } catch (error) {
      logger.error(`Error recording GPS status for device ${data.deviceImei}:`, error);
      throw error;
    }
  }

  async getLocations(query: GpsTrackingQuery): Promise<GpsTracking[]> {
    try {
      return await this.gpsTrackingRepository.findLocations(query);
    } catch (error) {
      logger.error("Error getting GPS locations:", error);
      throw error;
    }
  }

  async getLatestLocation(deviceImei: string): Promise<GpsTracking | null> {
    try {
      return await this.gpsTrackingRepository.findLatestLocation(deviceImei);
    } catch (error) {
      logger.error(`Error getting latest GPS location for device ${deviceImei}:`, error);
      throw error;
    }
  }
}
