import { IdleSummaryStatus } from "../domain/enums/IdleSummaryStatus";
import {
  TRAVEL_SUMMARY_MAX_GAP_MS,
  TravelTrackPoint,
} from "../domain/models/TravelSummary";

export type IdleSummarySegment = {
  status: IdleSummaryStatus;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  durationMinutes: number;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
};

/**
 * Builds contiguous Idle / Ignition Off segments from track points.
 * Same gap rules as travel summary: long packet gaps break a segment.
 */
export function buildIdleSummarySegments(
  points: TravelTrackPoint[],
  options: {
    minDurationMinutes: number;
    statuses?: IdleSummaryStatus[];
    maxGapMs?: number;
  },
): IdleSummarySegment[] {
  if (points.length === 0) {
    return [];
  }

  const maxGapMs = options.maxGapMs ?? TRAVEL_SUMMARY_MAX_GAP_MS;
  const minDurationMs = Math.max(0, options.minDurationMinutes) * 60 * 1000;
  const allowed = new Set(
    options.statuses?.length
      ? options.statuses
      : [IdleSummaryStatus.IDLE, IdleSummaryStatus.IGNITION_OFF],
  );

  const ordered = [...points].sort(
    (a, b) => a.locationTime.getTime() - b.locationTime.getTime(),
  );

  const segments: IdleSummarySegment[] = [];
  let currentStatus: IdleSummaryStatus | null = null;
  let segmentStart: TravelTrackPoint | null = null;
  let segmentEnd: TravelTrackPoint | null = null;

  const flush = () => {
    if (!currentStatus || !segmentStart || !segmentEnd) {
      currentStatus = null;
      segmentStart = null;
      segmentEnd = null;
      return;
    }
    const durationMs =
      segmentEnd.locationTime.getTime() - segmentStart.locationTime.getTime();
    if (durationMs >= minDurationMs && allowed.has(currentStatus)) {
      segments.push({
        status: currentStatus,
        startTime: segmentStart.locationTime,
        endTime: segmentEnd.locationTime,
        durationMs,
        durationMinutes: Math.round((durationMs / 60_000) * 10) / 10,
        latitude: toCoordinate(segmentStart.latitude),
        longitude: toCoordinate(segmentStart.longitude),
        address: segmentStart.address ?? null,
      });
    }
    currentStatus = null;
    segmentStart = null;
    segmentEnd = null;
  };

  for (let index = 0; index < ordered.length; index += 1) {
    const point = ordered[index];
    const status = classifyIdleStatus(point);
    const previous = ordered[index - 1];
    const gapMs = previous
      ? point.locationTime.getTime() - previous.locationTime.getTime()
      : 0;
    const gapBreak = Boolean(previous && (gapMs <= 0 || gapMs > maxGapMs));

    if (!status) {
      flush();
      continue;
    }

    if (gapBreak || currentStatus !== status) {
      flush();
      currentStatus = status;
      segmentStart = point;
      segmentEnd = point;
      continue;
    }

    segmentEnd = point;
  }

  flush();
  return segments;
}

function classifyIdleStatus(point: TravelTrackPoint): IdleSummaryStatus | null {
  const speed = Number(point.speed) || 0;
  if (speed > 0) {
    return null;
  }
  if (!point.ignitionStatus) {
    return IdleSummaryStatus.IGNITION_OFF;
  }
  return IdleSummaryStatus.IDLE;
}

function toCoordinate(value: number): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
