export type GpsEnabledVehicleStatus = 'running' | 'idle' | 'stop' | 'inactive' | 'no-gps';

export type VehicleGpsStatusOptions = {
  inactiveAfterMinutes?: number;
  runningSpeedThresholdKmh?: number;
};

export type GpsDeviceStatusInput = {
  latitude?: number | string | null;
  longitude?: number | string | null;
  locationTime?: Date | string | null;
  ignitionStatus?: boolean | null;
  speed?: number | string | null;
};

/** Defaults come from env so the live API and socket payloads agree. */
export function loadVehicleGpsStatusOptions(): Required<VehicleGpsStatusOptions> {
  const inactive = Number(process.env.GPS_INACTIVE_AFTER_MINUTES);
  const running = Number(process.env.GPS_RUNNING_SPEED_THRESHOLD_KMH);
  return {
    inactiveAfterMinutes: Number.isFinite(inactive) && inactive > 0 ? inactive : 180,
    runningSpeedThresholdKmh: Number.isFinite(running) && running >= 0 ? running : 0,
  };
}

export function resolveGpsEnabledVehicleStatus(
  gpsDevice?: GpsDeviceStatusInput | null,
  options?: VehicleGpsStatusOptions,
): GpsEnabledVehicleStatus {
  if (!gpsDevice) return 'no-gps';

  const latitude = gpsDevice.latitude != null ? Number(gpsDevice.latitude) : null;
  const longitude = gpsDevice.longitude != null ? Number(gpsDevice.longitude) : null;
  const locationTime = gpsDevice.locationTime ?? null;
  if (latitude === null && longitude === null && locationTime === null) return 'no-gps';

  const inactiveAfterMinutes = Math.max(1, Number(options?.inactiveAfterMinutes ?? 180));
  const runningSpeedThresholdKmh = Math.max(0, Number(options?.runningSpeedThresholdKmh ?? 0));

  if (locationTime) {
    const staleMs = Date.now() - new Date(locationTime).getTime();
    if (staleMs > inactiveAfterMinutes * 60 * 1000) return 'inactive';
  }

  if (!gpsDevice.ignitionStatus) return 'stop';
  const speed = gpsDevice.speed != null ? Number(gpsDevice.speed) : 0;
  if (speed > runningSpeedThresholdKmh) return 'running';
  return 'idle';
}

export function resolveGpsEnabledVehicleStatusLabel(status: GpsEnabledVehicleStatus): string {
  switch (status) {
    case 'running':
      return 'Running';
    case 'idle':
      return 'Idle';
    case 'stop':
      return 'Stop';
    case 'inactive':
      return 'Inactive';
    case 'no-gps':
    default:
      return 'No GPS';
  }
}
