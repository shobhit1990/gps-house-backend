export interface VehicleGpsDeviceResolution {
  registered: boolean;
  mapped: boolean;
  /** Canonical IMEI from gps_devices table when known. */
  deviceImei?: string;
  vehicleId?: string;
  vehicleNumber?: string;
}

export interface IVehicleGpsDeviceResolver {
  resolveDevice(deviceImei: string): Promise<VehicleGpsDeviceResolution>;
  refreshCache(): Promise<void>;
  startCacheRefresh(): void;
}
