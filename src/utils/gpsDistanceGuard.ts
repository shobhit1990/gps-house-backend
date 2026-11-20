export interface GpsDistancePoint {
  latitude?: number | null;
  longitude?: number | null;
  locationTime?: Date | null;
  speed?: number | null;
  satellite?: number | null;
  accuracy?: number | null;
}

export interface GpsDistanceDecision {
  accepted: boolean;
  distanceMeters: number;
  reason?: string;
  elapsedSeconds?: number;
  impliedSpeedKmh?: number;
}

export interface GpsDistanceGuardOptions {
  maxSpeedKmh?: number;
  maxSegmentMeters?: number;
  maxStationaryJumpMeters?: number;
  minMovementMeters?: number;
  /** Reject points with horizontal accuracy worse than this (meters). */
  maxAccuracyMeters?: number;
  /**
   * When true, a large coordinate change is treated as GPS drift rather than
   * travel (phone sitting still, `isMoving=false` / activity still).
   */
  assumeStationary?: boolean;
  /**
   * Treat the previous point as stale after this many seconds: the current point is
   * accepted as a fresh start (distance 0) instead of being judged against it.
   * Rejected points never move the anchor, so without this one bad/old anchor
   * (overnight gap, drift while "still") rejects every later point forever.
   */
  staleAnchorSeconds?: number;
}

const DEFAULT_MAX_SPEED_KMH = Number(process.env.GPS_DISTANCE_MAX_SPEED_KMH) || 120;
const DEFAULT_MAX_SEGMENT_METERS = Number(process.env.GPS_DISTANCE_MAX_SEGMENT_METERS) || 10_000;
const DEFAULT_MAX_STATIONARY_JUMP_METERS =
  Number(process.env.GPS_DISTANCE_MAX_STATIONARY_JUMP_METERS) || 100;
const DEFAULT_MIN_MOVEMENT_METERS = Number(process.env.GPS_DISTANCE_MIN_MOVEMENT_METERS) || 5;

/** Employee phone GPS — tighter than vehicle telematics to avoid trail jumps. */
export const EMPLOYEE_GPS_TRAIL_OPTIONS: GpsDistanceGuardOptions = {
  maxSpeedKmh: Number(process.env.EMPLOYEE_GPS_MAX_SPEED_KMH) || 80,
  maxSegmentMeters: Number(process.env.EMPLOYEE_GPS_MAX_SEGMENT_METERS) || 5_000,
  maxStationaryJumpMeters:
    Number(process.env.EMPLOYEE_GPS_MAX_STATIONARY_JUMP_METERS) || 40,
  minMovementMeters: Number(process.env.EMPLOYEE_GPS_MIN_MOVEMENT_METERS) || 3,
  maxAccuracyMeters: Number(process.env.EMPLOYEE_GPS_MAX_ACCURACY_METERS) || 100,
  staleAnchorSeconds: Number(process.env.EMPLOYEE_GPS_STALE_ANCHOR_SECONDS) || 300,
};

function isValidCoordinate(latitude: unknown, longitude: unknown): latitude is number {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

export function isValidGpsPoint(point: Pick<GpsDistancePoint, 'latitude' | 'longitude'>): boolean {
  return isValidCoordinate(point.latitude, point.longitude);
}

export function haversineDistanceMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number {
  const earthRadiusMeters = 6371000;
  const dLat = ((toLatitude - fromLatitude) * Math.PI) / 180;
  const dLon = ((toLongitude - fromLongitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((fromLatitude * Math.PI) / 180) *
      Math.cos((toLatitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusMeters * c * 100) / 100;
}

export function calculateGuardedGpsDistance(
  previous: GpsDistancePoint | null | undefined,
  current: GpsDistancePoint,
  options: GpsDistanceGuardOptions = {},
): GpsDistanceDecision {
  if (!isValidGpsPoint(current)) {
    return { accepted: false, distanceMeters: 0, reason: 'invalid_current_coordinate' };
  }

  const maxAccuracyMeters = options.maxAccuracyMeters;
  if (
    typeof maxAccuracyMeters === 'number' &&
    maxAccuracyMeters > 0 &&
    typeof current.accuracy === 'number' &&
    Number.isFinite(current.accuracy) &&
    current.accuracy > maxAccuracyMeters
  ) {
    return {
      accepted: false,
      distanceMeters: 0,
      reason: 'accuracy_too_poor',
    };
  }

  if (previous?.latitude == null || previous.longitude == null) {
    return { accepted: true, distanceMeters: 0 };
  }

  if (!isValidGpsPoint(previous)) {
    return { accepted: true, distanceMeters: 0 };
  }

  const distanceMeters = haversineDistanceMeters(
    previous.latitude,
    previous.longitude,
    current.latitude!,
    current.longitude!,
  );

  const minMovementMeters = options.minMovementMeters ?? DEFAULT_MIN_MOVEMENT_METERS;
  if (distanceMeters <= minMovementMeters) {
    return { accepted: true, distanceMeters: 0 };
  }

  const elapsedSeconds =
    previous.locationTime && current.locationTime
      ? (current.locationTime.getTime() - previous.locationTime.getTime()) / 1000
      : undefined;

  if (elapsedSeconds !== undefined && elapsedSeconds <= 0) {
    return {
      accepted: false,
      distanceMeters: 0,
      reason: 'non_increasing_location_time',
      elapsedSeconds,
    };
  }

  const staleAnchorSeconds = options.staleAnchorSeconds;
  if (
    elapsedSeconds !== undefined &&
    typeof staleAnchorSeconds === 'number' &&
    staleAnchorSeconds > 0 &&
    elapsedSeconds > staleAnchorSeconds
  ) {
    return { accepted: true, distanceMeters: 0, reason: 'stale_anchor_reset', elapsedSeconds };
  }

  const previousSpeed = Number(previous.speed ?? 0);
  const currentSpeed = Number(current.speed ?? 0);
  const maxReportedSpeed = Math.max(previousSpeed, currentSpeed);
  const maxStationaryJumpMeters =
    options.maxStationaryJumpMeters ?? DEFAULT_MAX_STATIONARY_JUMP_METERS;
  const looksStationary =
    options.assumeStationary === true || maxReportedSpeed <= 0;
  if (looksStationary && distanceMeters > maxStationaryJumpMeters) {
    return {
      accepted: false,
      distanceMeters: 0,
      reason: 'stationary_coordinate_jump',
      elapsedSeconds,
    };
  }

  const maxSegmentMeters = options.maxSegmentMeters ?? DEFAULT_MAX_SEGMENT_METERS;
  if (distanceMeters > maxSegmentMeters) {
    return {
      accepted: false,
      distanceMeters: 0,
      reason: 'segment_distance_too_large',
      elapsedSeconds,
    };
  }

  if (elapsedSeconds !== undefined) {
    const impliedSpeedKmh = (distanceMeters / elapsedSeconds) * 3.6;
    const maxSpeedKmh = options.maxSpeedKmh ?? DEFAULT_MAX_SPEED_KMH;
    if (impliedSpeedKmh > maxSpeedKmh) {
      return {
        accepted: false,
        distanceMeters: 0,
        reason: 'impossible_speed',
        elapsedSeconds,
        impliedSpeedKmh: Math.round(impliedSpeedKmh * 100) / 100,
      };
    }

    return {
      accepted: true,
      distanceMeters,
      elapsedSeconds,
      impliedSpeedKmh: Math.round(impliedSpeedKmh * 100) / 100,
    };
  }

  return { accepted: true, distanceMeters };
}

/**
 * Walk a chronological trail and drop teleport / poor-accuracy points so the
 * polyline stays continuous. Distance on kept points is recomputed against the
 * previous accepted point.
 */
export function filterGuardedGpsTrail<T>(
  points: T[],
  getPoint: (item: T) => GpsDistancePoint,
  options: GpsDistanceGuardOptions = EMPLOYEE_GPS_TRAIL_OPTIONS,
): Array<{ item: T; distanceMeters: number }> {
  const kept: Array<{ item: T; distanceMeters: number }> = [];
  let previous: GpsDistancePoint | null = null;

  for (const item of points) {
    const current = getPoint(item);
    const decision = calculateGuardedGpsDistance(previous, current, options);
    if (!decision.accepted) {
      continue;
    }
    kept.push({ item, distanceMeters: decision.distanceMeters });
    previous = current;
  }

  return kept;
}
