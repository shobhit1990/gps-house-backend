import { GpsEnabledVehicleStatus } from "../../utils/vehicleGpsStatus";

export type VehicleLiveTrackingRef = {
  id: string;
  name: string | null;
};

export type VehicleLiveTrackingGpsDevice = {
  id: string;
  deviceImei: string;
  simNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  direction: number | null;
  ignitionStatus: boolean;
  locationTime: Date | null;
  satellite: number | null;
  gpsRealTime: string | null;
  gpsPositioning: string | null;
  gsmSignal: string | null;
  charging: boolean | null;
  voltage: string | null;
  terminalInfo: string | null;
  alarm: string | null;
  alarmStatus: string | null;
  distance: number | null;
  odometer: number | null;
  /** Reverse-geocoded address of the live position (may lag up to GEOCODER_MIN_MOVE_METERS). */
  address: string | null;
  addressUpdatedAt: Date | null;
};

export type VehicleLiveTrackingItem = {
  vehicleId: string;
  vehicleNumber: string | null;
  vehicleNickname: string | null;
  vehicleType: string | null;
  overspeed: number | null;
  status: string | null;
  /** running | idle | stop | inactive | no-gps (thresholds from GPS_INACTIVE_AFTER_MINUTES / GPS_RUNNING_SPEED_THRESHOLD_KMH). */
  gpsStatus: GpsEnabledVehicleStatus;
  gpsStatusLabel: string;
  client: VehicleLiveTrackingRef | null;
  transporter: VehicleLiveTrackingRef | null;
  gpsDevice: VehicleLiveTrackingGpsDevice | null;
};
