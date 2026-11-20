import { inject, injectable } from "tsyringe";
import { AddVehicle } from "../domain/entities/mysql/AddVehicle";
import { VehicleLiveTrackingItem } from "../domain/models/VehicleLiveTrackingModels";
import {
  IVehicleGpsDeviceRepository,
  LiveTrackingVehicleFilter,
} from "../domain/repositories/mysql/IVehicleGpsDeviceRepository";
import {
  loadVehicleGpsStatusOptions,
  resolveGpsEnabledVehicleStatus,
  resolveGpsEnabledVehicleStatusLabel,
} from "../utils/vehicleGpsStatus";
import { IVehicleLiveTrackingService } from "./interfaces/IVehicleLiveTrackingService";

/** Snapshot for the live map; later updates arrive over Socket.IO (`vehicle.location.updated`). */
@injectable()
export class VehicleLiveTrackingService implements IVehicleLiveTrackingService {
  constructor(
    @inject("IVehicleGpsDeviceRepository")
    private readonly vehicleGpsDeviceRepository: IVehicleGpsDeviceRepository,
  ) {}

  async getVehicleLiveTracking(filter: LiveTrackingVehicleFilter = {}): Promise<VehicleLiveTrackingItem[]> {
    const vehicles = await this.vehicleGpsDeviceRepository.listVehiclesForLiveTracking(filter);
    const statusOptions = loadVehicleGpsStatusOptions();
    return vehicles.map((vehicle) => this.toItem(vehicle, statusOptions));
  }

  private toItem(
    vehicle: AddVehicle,
    statusOptions: ReturnType<typeof loadVehicleGpsStatusOptions>,
  ): VehicleLiveTrackingItem {
    const d = vehicle.device && !vehicle.device.isDeleted ? vehicle.device : null;
    const client = vehicle.client;
    const transporter = vehicle.transporter;
    const gpsStatus = resolveGpsEnabledVehicleStatus(d, statusOptions);

    return {
      vehicleId: vehicle.externalId,
      vehicleNumber: vehicle.vehicle ?? null,
      vehicleNickname: vehicle.vehicleNickname ?? null,
      vehicleType: vehicle.vehicleType ?? null,
      overspeed: vehicle.overspeed ?? null,
      status: vehicle.status ?? null,
      gpsStatus,
      gpsStatusLabel: resolveGpsEnabledVehicleStatusLabel(gpsStatus),
      client: client
        ? { id: client.externalId, name: client.companyName ?? client.name ?? null }
        : null,
      transporter: transporter
        ? { id: transporter.externalId, name: transporter.companyName ?? transporter.name ?? null }
        : null,
      gpsDevice: d
        ? {
            id: d.externalId,
            deviceImei: d.imei,
            simNumber: d.simNumber ?? null,
            latitude: toNumber(d.latitude),
            longitude: toNumber(d.longitude),
            speed: toNumber(d.speed),
            direction: toNumber(d.direction),
            ignitionStatus: d.ignitionStatus ?? false,
            locationTime: d.locationTime ?? null,
            satellite: d.satellite ?? null,
            gpsRealTime: d.gpsRealTime ?? null,
            gpsPositioning: d.gpsPositioning ?? null,
            gsmSignal: d.gsmSignal ?? null,
            charging: d.charging ?? null,
            voltage: d.voltage ?? null,
            terminalInfo: d.terminalInfo ?? null,
            alarm: d.alarm ?? null,
            alarmStatus: d.alarmStatus ?? null,
            distance: toNumber(d.distance),
            odometer: toNumber(d.odometer),
          }
        : null,
    };
  }
}

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
