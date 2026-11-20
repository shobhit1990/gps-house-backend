export interface TravelTrackPoint {
  vehicleId: string;
  locationTime: Date;
  latitude: number;
  longitude: number;
  speed: number;
  ignitionStatus: boolean;
  distance: number;
  address: string | null;
}

export interface TravelSummaryStats {
  startTime: Date | null;
  endTime: Date | null;
  startLatitude: number | null;
  startLongitude: number | null;
  startAddress: string | null;
  endLatitude: number | null;
  endLongitude: number | null;
  endAddress: string | null;
  distanceMeters: number;
  distanceKm: number;
  maxSpeed: number;
  avgSpeed: number;
  runningMs: number;
  idleMs: number;
  stopMs: number;
  pointCount: number;
}

export const TRAVEL_SUMMARY_MAX_RANGE_MS = 31 * 24 * 60 * 60 * 1000;
export const TRAVEL_SUMMARY_POINT_CAP = 100_000;
export const TRAVEL_SUMMARY_MAX_GAP_MS = 10 * 60 * 1000;
