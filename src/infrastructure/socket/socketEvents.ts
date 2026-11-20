/** All socket event names — single source of truth for both server and client. */
export const SocketEvents = {
  // Vehicle live tracking
  VEHICLE_LOCATION_UPDATED: "vehicle.location.updated",
} as const;

export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];

/** Room names (prefixed with APP_CLIENT_NAMESPACE at runtime via socketRoom()). */
export const SocketRooms = {
  VEHICLE_LIVE_TRACKING: "vehicle-live-tracking",
} as const;

/** Redis pub/sub channels used to bridge GPS worker processes to the API socket process. */
export const SocketRedisChannels = {
  VEHICLE_LOCATION_UPDATED: "socket:vehicle-location:updated",
} as const;

/** Payload for vehicle.location.updated */
export type VehicleLocationUpdatedPayload = {
  vehicleId: string;
  vehicleNumber: string | null;
  deviceImei: string;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  direction: number | null;
  ignitionStatus: boolean;
  locationTime: string | null;
  gsmSignal: string | null;
  charging: boolean | null;
  voltage: string | null;
  alarm: string | null;
  terminalInfo: string | null;
  satellite: number | null;
  distance: number | null;
  odometer: number | null;
  /** Last resolved address; may lag the position until the geocoder catches up. */
  address: string | null;
};
