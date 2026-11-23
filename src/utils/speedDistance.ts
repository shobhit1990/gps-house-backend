import { TravelTrackPoint } from "../domain/models/TravelSummary";

export type SpeedDistanceStats = {
  /** Distance (km) while speed was in [0, 40). */
  speed0To40Km: number;
  /** Distance (km) while speed was in [40, 60). */
  speed40To60Km: number;
  /** Distance (km) while speed was in [60, 80). */
  speed60To80Km: number;
  /** Distance (km) while speed was >= 80. */
  speed80PlusKm: number;
  totalDistanceKm: number;
  pointCount: number;
};

export function emptySpeedDistanceStats(): SpeedDistanceStats {
  return {
    speed0To40Km: 0,
    speed40To60Km: 0,
    speed60To80Km: 0,
    speed80PlusKm: 0,
    totalDistanceKm: 0,
    pointCount: 0,
  };
}

/**
 * Attributes each track point's `distance` (meters) into speed brackets using that point's speed.
 * Brackets: 0–40, 40–60, 60–80, 80+.
 */
export function summarizeSpeedDistance(
  points: TravelTrackPoint[],
): SpeedDistanceStats {
  if (points.length === 0) {
    return emptySpeedDistanceStats();
  }

  let meters0To40 = 0;
  let meters40To60 = 0;
  let meters60To80 = 0;
  let meters80Plus = 0;

  for (const point of points) {
    const meters = Number(point.distance) || 0;
    if (meters <= 0) {
      continue;
    }
    const speed = Number(point.speed) || 0;
    if (speed < 40) {
      meters0To40 += meters;
    } else if (speed < 60) {
      meters40To60 += meters;
    } else if (speed < 80) {
      meters60To80 += meters;
    } else {
      meters80Plus += meters;
    }
  }

  const totalMeters =
    meters0To40 + meters40To60 + meters60To80 + meters80Plus;

  return {
    speed0To40Km: roundKm(meters0To40),
    speed40To60Km: roundKm(meters40To60),
    speed60To80Km: roundKm(meters60To80),
    speed80PlusKm: roundKm(meters80Plus),
    totalDistanceKm: roundKm(totalMeters),
    pointCount: points.length,
  };
}

function roundKm(meters: number): number {
  return Math.round((meters / 1000) * 100) / 100;
}
