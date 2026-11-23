import {
  TRAVEL_SUMMARY_MAX_GAP_MS,
  TravelTrackPoint,
} from "../domain/models/TravelSummary";

export type RideSegment = {
  startTime: Date;
  endTime: Date;
  startLatitude: number | null;
  startLongitude: number | null;
  startAddress: string | null;
  endLatitude: number | null;
  endLongitude: number | null;
  endAddress: string | null;
  durationMinutes: number;
};

/**
 * Contiguous moving segments (speed > 0). Long GPS gaps break a ride.
 * Only rides with duration >= minDurationMinutes are returned.
 */
export function buildRideSegments(
  points: TravelTrackPoint[],
  options: {
    minDurationMinutes: number;
    maxGapMs?: number;
  },
): RideSegment[] {
  if (points.length === 0) {
    return [];
  }

  const maxGapMs = options.maxGapMs ?? TRAVEL_SUMMARY_MAX_GAP_MS;
  const minDurationMs = Math.max(0, options.minDurationMinutes) * 60 * 1000;

  const ordered = [...points].sort(
    (a, b) => a.locationTime.getTime() - b.locationTime.getTime(),
  );

  const segments: RideSegment[] = [];
  let segmentStart: TravelTrackPoint | null = null;
  let segmentEnd: TravelTrackPoint | null = null;

  const flush = () => {
    if (!segmentStart || !segmentEnd) {
      segmentStart = null;
      segmentEnd = null;
      return;
    }
    const durationMs =
      segmentEnd.locationTime.getTime() - segmentStart.locationTime.getTime();
    if (durationMs >= minDurationMs) {
      segments.push({
        startTime: segmentStart.locationTime,
        endTime: segmentEnd.locationTime,
        startLatitude: toCoordinate(segmentStart.latitude),
        startLongitude: toCoordinate(segmentStart.longitude),
        startAddress: segmentStart.address ?? null,
        endLatitude: toCoordinate(segmentEnd.latitude),
        endLongitude: toCoordinate(segmentEnd.longitude),
        endAddress: segmentEnd.address ?? null,
        durationMinutes: Math.round((durationMs / 60_000) * 10) / 10,
      });
    }
    segmentStart = null;
    segmentEnd = null;
  };

  for (let index = 0; index < ordered.length; index += 1) {
    const point = ordered[index];
    const moving = (Number(point.speed) || 0) > 0;
    const previous = ordered[index - 1];
    const gapMs = previous
      ? point.locationTime.getTime() - previous.locationTime.getTime()
      : 0;
    const gapBreak = Boolean(previous && (gapMs <= 0 || gapMs > maxGapMs));

    if (!moving) {
      flush();
      continue;
    }

    if (!segmentStart || gapBreak) {
      flush();
      segmentStart = point;
      segmentEnd = point;
      continue;
    }

    segmentEnd = point;
  }

  flush();
  return segments;
}

function toCoordinate(value: number): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
