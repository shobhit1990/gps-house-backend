import { AddVehicle } from "../../entities/mysql/AddVehicle";
import { Device } from "../../entities/mysql/Device";

/** Live GPS columns on `device` that the GPS queue stages may write. */
export type DeviceLiveStatePatch = Partial<
  Pick<
    Device,
    | "locationTime"
    | "lastFixTime"
    | "latitude"
    | "longitude"
    | "speed"
    | "direction"
    | "gpsRealTime"
    | "gpsPositioning"
    | "mcc"
    | "mnc"
    | "lac"
    | "cellId"
    | "ignitionStatus"
    | "distance"
    | "distance1"
    | "odometer"
    | "satellite"
    | "latitudeType"
    | "longitudeType"
    | "batchId"
    | "terminalInfo"
    | "oilElectricity"
    | "gpsTracking"
    | "charging"
    | "ignition"
    | "defence"
    | "voltage"
    | "gsmSignal"
    | "alarm"
    | "alarmStatus"
  >
>;

export type LiveTrackingVehicleFilter = {
  clientId?: string;
  transporterId?: string;
};

/**
 * MySQL access for the GPS pipeline: IMEI → Device → AddVehicle mapping and the
 * device's live position columns (dikshank-backend kept these on GpsDevice).
 */
export interface IVehicleGpsDeviceRepository {
  /** Non-deleted device by exact IMEI (any status). */
  findDeviceByImei(imei: string): Promise<Device | null>;
  /** Writes only the given live columns; never touches admin-managed device fields. */
  updateDeviceLiveState(deviceId: number, patch: DeviceLiveStatePatch): Promise<void>;
  /** Non-deleted, non-inactive vehicle currently assigned to the device. */
  findMappedVehicleByDeviceId(deviceId: number): Promise<AddVehicle | null>;
  /** All non-deleted devices (for the IMEI resolution cache). */
  listDevices(): Promise<Device[]>;
  /** All non-deleted, non-inactive vehicles that have a device, with device populated. */
  listVehiclesWithDevice(): Promise<AddVehicle[]>;
  /** Vehicles for the live map, with device, client and transporter populated. */
  listVehiclesForLiveTracking(filter?: LiveTrackingVehicleFilter): Promise<AddVehicle[]>;
  /** Non-deleted vehicle by external id, with device populated. */
  findVehicleByExternalId(externalId: string): Promise<AddVehicle | null>;
}
