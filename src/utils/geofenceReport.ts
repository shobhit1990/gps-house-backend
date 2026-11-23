import { Duration } from "../domain/enums/Duration";
import { Shapes } from "../domain/enums/Shapes";
import {
  TRAVEL_SUMMARY_MAX_GAP_MS,
  TravelTrackPoint,
} from "../domain/models/TravelSummary";
import { haversineDistanceMeters } from "./gpsDistanceGuard";

export type GeofenceArea = {
  id: string;
  name: string;
  shapes: Shapes | null;
  latitude: number;
  longitude: number;
  radius: number | null;
  reportType: string | null;
  remark: string | null;
};

export type GeofenceVisit = {
  geofenceId: string;
  geoName: string;
  inTime: Date;
  outTime: Date;
  inLatitude: number | null;
  inLongitude: number | null;
  inAddress: string | null;
  outLatitude: number | null;
  outLongitude: number | null;
  outAddress: string | null;
  haltMinutes: number;
  distanceMeters: number;
  reportType: string | null;
  remark: string | null;
};

/**
 * Detect enter/exit visits for each geofence against ordered GPS points.
 * Circle: center + radius (meters). Polygon/rectangle without ring data
 * falls back to circle when radius is present.
 */
export function buildGeofenceVisits(
  points: TravelTrackPoint[],
  geofences: GeofenceArea[],
  options?: { maxGapMs?: number },
): GeofenceVisit[] {
  if (points.length === 0 || geofences.length === 0) {
    return [];
  }

  const maxGapMs = options?.maxGapMs ?? TRAVEL_SUMMARY_MAX_GAP_MS;
  const ordered = [...points].sort(
    (a, b) => a.locationTime.getTime() - b.locationTime.getTime(),
  );

  const visits: GeofenceVisit[] = [];

  for (const geofence of geofences) {
    let inside = false;
    let enterPoint: TravelTrackPoint | null = null;
    let lastInsidePoint: TravelTrackPoint | null = null;
    let distanceMeters = 0;

    const flush = (exitPoint: TravelTrackPoint) => {
      if (!enterPoint || !lastInsidePoint) {
        inside = false;
        enterPoint = null;
        lastInsidePoint = null;
        distanceMeters = 0;
        return;
      }
      const haltMs =
        exitPoint.locationTime.getTime() - enterPoint.locationTime.getTime();
      visits.push({
        geofenceId: geofence.id,
        geoName: geofence.name,
        inTime: enterPoint.locationTime,
        outTime: exitPoint.locationTime,
        inLatitude: toCoordinate(enterPoint.latitude),
        inLongitude: toCoordinate(enterPoint.longitude),
        inAddress: enterPoint.address ?? null,
        outLatitude: toCoordinate(exitPoint.latitude),
        outLongitude: toCoordinate(exitPoint.longitude),
        outAddress: exitPoint.address ?? null,
        haltMinutes: Math.round((haltMs / 60_000) * 10) / 10,
        distanceMeters: Math.round(distanceMeters * 100) / 100,
        reportType: geofence.reportType,
        remark: geofence.remark,
      });
      inside = false;
      enterPoint = null;
      lastInsidePoint = null;
      distanceMeters = 0;
    };

    for (let index = 0; index < ordered.length; index += 1) {
      const point = ordered[index];
      const previous = ordered[index - 1];
      const gapMs = previous
        ? point.locationTime.getTime() - previous.locationTime.getTime()
        : 0;
      const gapBreak = Boolean(previous && (gapMs <= 0 || gapMs > maxGapMs));

      if (gapBreak && inside && lastInsidePoint) {
        flush(lastInsidePoint);
      }

      const isInside = isPointInsideGeofence(point, geofence);

      if (isInside) {
        if (!inside) {
          inside = true;
          enterPoint = point;
          lastInsidePoint = point;
          distanceMeters = 0;
        } else if (lastInsidePoint) {
          distanceMeters += Number(point.distance) || 0;
          lastInsidePoint = point;
        }
      } else if (inside && lastInsidePoint) {
        flush(point);
      }
    }

    if (inside && lastInsidePoint) {
      flush(lastInsidePoint);
    }
  }

  return visits;
}

export function matchesDuration(
  haltMinutes: number,
  duration: Duration,
): boolean {
  switch (duration) {
    case Duration.ALL:
      return true;
    case Duration.LESS_THAN_5_MINUTES:
      return haltMinutes < 5;
    case Duration.GREATER_THAN_5_AND_LESS_THAN_10_MINUTES:
      return haltMinutes > 5 && haltMinutes < 10;
    case Duration.GREATER_THAN_10_AND_LESS_THAN_30_MINUTES:
      return haltMinutes > 10 && haltMinutes < 30;
    case Duration.MORE_THAN_1_HOUR:
      return haltMinutes > 60;
    default:
      return true;
  }
}

function isPointInsideGeofence(
  point: TravelTrackPoint,
  geofence: GeofenceArea,
): boolean {
  const lat = toCoordinate(point.latitude);
  const lon = toCoordinate(point.longitude);
  if (lat === null || lon === null) {
    return false;
  }

  const radius = Number(geofence.radius);
  if (!Number.isFinite(radius) || radius <= 0) {
    return false;
  }

  const distance = haversineDistanceMeters(
    geofence.latitude,
    geofence.longitude,
    lat,
    lon,
  );
  return distance <= radius;
}

function toCoordinate(value: number): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
