import {
  TRAVEL_SUMMARY_MAX_GAP_MS,
  TravelSummaryStats,
  TravelTrackPoint,
} from "../domain/models/TravelSummary";
import { AppError } from "./errors";

export function emptyTravelSummary(): TravelSummaryStats {
  return {
    startTime: null,
    endTime: null,
    startLatitude: null,
    startLongitude: null,
    startAddress: null,
    endLatitude: null,
    endLongitude: null,
    endAddress: null,
    distanceMeters: 0,
    distanceKm: 0,
    maxSpeed: 0,
    avgSpeed: 0,
    runningMs: 0,
    idleMs: 0,
    stopMs: 0,
    pointCount: 0,
  };
}

/** Gaps longer than this are missing packets, not continuous travel or stoppage. */
export function summarizeTravelPoints(
  points: TravelTrackPoint[],
  maxGapMs = TRAVEL_SUMMARY_MAX_GAP_MS,
): TravelSummaryStats {
  if (points.length === 0) {
    return emptyTravelSummary();
  }

  const ordered = [...points].sort(
    (a, b) => a.locationTime.getTime() - b.locationTime.getTime(),
  );
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  let distanceMeters = 0;
  let maxSpeed = 0;
  let speedSum = 0;
  let movingPoints = 0;
  let runningMs = 0;
  let idleMs = 0;
  let stopMs = 0;

  for (let index = 0; index < ordered.length; index += 1) {
    const point = ordered[index];
    const speed = Number(point.speed) || 0;
    distanceMeters += Number(point.distance) || 0;
    if (speed > maxSpeed) {
      maxSpeed = speed;
    }
    if (speed > 0) {
      speedSum += speed;
      movingPoints += 1;
    }

    const previous = ordered[index - 1];
    if (!previous) {
      continue;
    }
    const gapMs = point.locationTime.getTime() - previous.locationTime.getTime();
    if (gapMs <= 0 || gapMs > maxGapMs) {
      continue;
    }
    const previousSpeed = Number(previous.speed) || 0;
    if (previousSpeed > 0) {
      runningMs += gapMs;
    } else if (previous.ignitionStatus) {
      idleMs += gapMs;
    } else {
      stopMs += gapMs;
    }
  }

  return {
    startTime: first.locationTime,
    endTime: last.locationTime,
    startLatitude: toCoordinate(first.latitude),
    startLongitude: toCoordinate(first.longitude),
    startAddress: first.address ?? null,
    endLatitude: toCoordinate(last.latitude),
    endLongitude: toCoordinate(last.longitude),
    endAddress: last.address ?? null,
    distanceMeters: round(distanceMeters, 2),
    distanceKm: round(distanceMeters / 1000, 2),
    maxSpeed: round(maxSpeed, 1),
    avgSpeed: movingPoints > 0 ? round(speedSum / movingPoints, 1) : 0,
    runningMs,
    idleMs,
    stopMs,
    pointCount: ordered.length,
  };
}

/** Portal range values: `20/11/2026 00:00` and `20/11/2026 23:59`, or ISO. */
export function parseTravelDateTime(
  value: string,
  fieldName: string,
): Date {
  const trimmed = value.trim();
  const match = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const hours = Number(match[4] ?? 0);
    const minutes = Number(match[5] ?? 0);
    const seconds =
      match[6] !== undefined ? Number(match[6]) : minutes === 59 ? 59 : 0;
    const parsed = new Date(year, month - 1, day, hours, minutes, seconds);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      throw new AppError(`Invalid ${fieldName}`, 400);
    }
    return parsed;
  }

  const iso = new Date(trimmed);
  if (Number.isNaN(iso.getTime())) {
    throw new AppError(
      `Invalid ${fieldName}. Use DD/MM/YYYY HH:mm or ISO datetime`,
      400,
    );
  }
  return iso;
}

function toCoordinate(value: number): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
