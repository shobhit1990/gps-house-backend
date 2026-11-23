import { VehicleStatus } from "../domain/enums/VehicleStatus";
import {
  TRAVEL_SUMMARY_MAX_GAP_MS,
  TravelTrackPoint,
} from "../domain/models/TravelSummary";

export type StatusReportSegment = {
  status: VehicleStatus;
  startTime: Date;
  endTime: Date;
  startLatitude: number | null;
  startLongitude: number | null;
  startAddress: string | null;
  endLatitude: number | null;
  endLongitude: number | null;
  endAddress: string | null;
};

/**
 * Builds contiguous VehicleStatus segments from GPS track points.
 * Priority: Overspeed → Ignition On → Idle → Ignition Off.
 * Gaps longer than maxGapMs become Unreachable segments.
 * Ac On is not derived from current GPS fields (no AC bit on track points).
 */
export function buildStatusReportSegments(
  points: TravelTrackPoint[],
  options: {
    overspeedThreshold: number;
    statuses?: VehicleStatus[];
    maxGapMs?: number;
  },
): StatusReportSegment[] {
  if (points.length === 0) {
    return [];
  }

  const maxGapMs = options.maxGapMs ?? TRAVEL_SUMMARY_MAX_GAP_MS;
  const allowed = new Set(
    options.statuses?.length
      ? options.statuses
      : Object.values(VehicleStatus),
  );
  const threshold = Number(options.overspeedThreshold) || 0;

  const ordered = [...points].sort(
    (a, b) => a.locationTime.getTime() - b.locationTime.getTime(),
  );

  const segments: StatusReportSegment[] = [];
  let currentStatus: VehicleStatus | null = null;
  let segmentStart: TravelTrackPoint | null = null;
  let segmentEnd: TravelTrackPoint | null = null;

  const flush = () => {
    if (!currentStatus || !segmentStart || !segmentEnd) {
      currentStatus = null;
      segmentStart = null;
      segmentEnd = null;
      return;
    }
    if (allowed.has(currentStatus)) {
      segments.push({
        status: currentStatus,
        startTime: segmentStart.locationTime,
        endTime: segmentEnd.locationTime,
        startLatitude: toCoordinate(segmentStart.latitude),
        startLongitude: toCoordinate(segmentStart.longitude),
        startAddress: segmentStart.address ?? null,
        endLatitude: toCoordinate(segmentEnd.latitude),
        endLongitude: toCoordinate(segmentEnd.longitude),
        endAddress: segmentEnd.address ?? null,
      });
    }
    currentStatus = null;
    segmentStart = null;
    segmentEnd = null;
  };

  const startSegment = (status: VehicleStatus, point: TravelTrackPoint) => {
    currentStatus = status;
    segmentStart = point;
    segmentEnd = point;
  };

  for (let index = 0; index < ordered.length; index += 1) {
    const point = ordered[index];
    const previous = ordered[index - 1];
    const status = classifyVehicleStatus(point, threshold);

    if (previous) {
      const gapMs =
        point.locationTime.getTime() - previous.locationTime.getTime();
      if (gapMs > maxGapMs) {
        flush();
        if (allowed.has(VehicleStatus.UNREACHABLE)) {
          segments.push({
            status: VehicleStatus.UNREACHABLE,
            startTime: previous.locationTime,
            endTime: point.locationTime,
            startLatitude: toCoordinate(previous.latitude),
            startLongitude: toCoordinate(previous.longitude),
            startAddress: previous.address ?? null,
            endLatitude: toCoordinate(point.latitude),
            endLongitude: toCoordinate(point.longitude),
            endAddress: point.address ?? null,
          });
        }
        startSegment(status, point);
        continue;
      }
    }

    if (!currentStatus) {
      startSegment(status, point);
      continue;
    }

    if (currentStatus !== status) {
      flush();
      startSegment(status, point);
      continue;
    }

    segmentEnd = point;
  }

  flush();
  return segments;
}

export function classifyVehicleStatus(
  point: TravelTrackPoint,
  overspeedThreshold: number,
): VehicleStatus {
  const speed = Number(point.speed) || 0;
  const threshold = Number(overspeedThreshold) || 0;

  if (threshold > 0 && speed >= threshold) {
    return VehicleStatus.OVERSPEED;
  }
  if (speed > 0 && point.ignitionStatus) {
    return VehicleStatus.IGNITION_ON;
  }
  if (speed <= 0 && point.ignitionStatus) {
    return VehicleStatus.IDLE;
  }
  return VehicleStatus.IGNITION_OFF;
}

function toCoordinate(value: number): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
