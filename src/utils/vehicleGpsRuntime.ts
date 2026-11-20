export function isVehicleGpsRuntimeEnabled(): boolean {
  return process.env.VEHICLE_GPS_ENABLED === 'true';
}

export function isVehicleGpsListenerEnabled(): boolean {
  return isVehicleGpsRuntimeEnabled() && process.env.GPS_LISTENER_ENABLED !== 'false';
}
