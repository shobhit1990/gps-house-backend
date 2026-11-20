export interface GpsLocationData {
  deviceImei: string;
  vehicleId?: string;
  vehicleNumber?: string;
  locationTime: Date;
  latitude: number;
  longitude: number;
  speed?: number;
  gpsRealTime?: string;
  gpsPositioning?: string;
  direction?: number;
  mcc?: string;
  mnc?: string;
  lac?: string;
  cellId?: string;
  /** true = ignition on, false = ignition off */
  ignitionStatus?: boolean;
  distance?: number;
  distance1?: number;
  /** Present on some mobile payloads; ignored for vehicle cumulative odometer. */
  odometer?: number;
  satellite?: number;
  latitudeType?: string;
  longitudeType?: string;
  batchId?: number;
  metadata?: Record<string, unknown>;
}

export interface GpsStatusData {
  deviceImei: string;
  vehicleId?: string;
  vehicleNumber?: string;
  locationTime?: Date;
  latitude?: number;
  longitude?: number;
  speed?: number;
  gpsRealTime?: string;
  gpsPositioning?: string;
  direction?: number;
  mcc?: string;
  mnc?: string;
  lac?: string;
  cellId?: string;
  distance?: number;
  distance1?: number;
  /** Present on some mobile payloads; ignored for vehicle cumulative odometer. */
  odometer?: number;
  satellite?: number;
  latitudeType?: string;
  longitudeType?: string;
  batchId?: number;
  terminalInfo?: string;
  oilElectricity?: boolean;
  gpsTracking?: string;
  alarmStatus?: string;
  alarm?: string;
  charging?: boolean;
  /** 0 = ignition off, 1 = ignition on (GPS queue always sends 0 or 1) */
  ignition?: string;
  defence?: string;
  voltage?: string;
  gsmSignal?: string;
  metadata?: Record<string, unknown>;
}

export interface GpsTrackingQuery {
  deviceImei?: string;
  /** Prefer for history: stable across GPS / IMEI swaps (vehicle external id). */
  vehicleId?: string;
  /** Fallback when vehicleId is unavailable. */
  vehicleNumber?: string;
  from?: Date | string;
  to?: Date | string;
  limit?: number;
  skip?: number;
  /** When false, includes stationary points (speed = 0). Default: true (same as before). */
  movingOnly?: boolean;
}

