import { SensorReportType } from "../domain/enums/SensorReportType";
import { TravelTrackPoint } from "../domain/models/TravelSummary";

export type SensorReportEvent = {
  vehicleId: string;
  type: SensorReportType;
  medium: string;
  added: Date;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

/** Maps Concox / stored alarm metadata onto SensorReportType. */
export function mapAlarmToSensorType(
  alarmType: unknown,
): SensorReportType | null {
  if (alarmType === undefined || alarmType === null) {
    return null;
  }
  const raw = String(alarmType).trim();
  const lower = raw.toLowerCase();
  const hex = raw.replace(/^0x/i, "").toLowerCase().padStart(2, "0");

  if (
    hex === "01" ||
    lower === "sos" ||
    lower.includes("panic on") ||
    lower === "panic"
  ) {
    return SensorReportType.PANIC_ON;
  }
  if (lower.includes("panic off") || lower === "panic_off") {
    return SensorReportType.PANIC_OFF;
  }
  if (
    hex === "02" ||
    lower === "powercut" ||
    lower.includes("power cut") ||
    lower.includes("battery disconnect") ||
    lower === "lowbattery"
  ) {
    return SensorReportType.BATTERY_DISCONNECT;
  }
  if (lower === "lock" || lower.includes("defence on")) {
    return SensorReportType.LOCK;
  }
  if (lower === "unlock" || lower.includes("defence off")) {
    return SensorReportType.UNLOCK;
  }
  if (lower === "parked") {
    return SensorReportType.PARKED;
  }
  if (lower === "unparked") {
    return SensorReportType.UNPARKED;
  }
  return null;
}

/**
 * Parked / Unparked from ignition transitions on track points.
 * Ignition On→Off = Parked, Off→On = Unparked.
 */
export function buildParkedSensorEvents(
  points: TravelTrackPoint[],
): SensorReportEvent[] {
  if (points.length < 2) {
    return [];
  }

  const ordered = [...points].sort(
    (a, b) => a.locationTime.getTime() - b.locationTime.getTime(),
  );
  const events: SensorReportEvent[] = [];

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const point = ordered[index];
    const wasOn = Boolean(previous.ignitionStatus);
    const isOn = Boolean(point.ignitionStatus);
    if (wasOn === isOn) {
      continue;
    }

    const type = isOn ? SensorReportType.UNPARKED : SensorReportType.PARKED;
    events.push({
      vehicleId: point.vehicleId,
      type,
      medium: "Ignition",
      added: point.locationTime,
      address: point.address ?? null,
      latitude: toCoordinate(point.latitude),
      longitude: toCoordinate(point.longitude),
    });
  }

  return events;
}

function toCoordinate(value: number): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
