/** GPS device DB / UI manual entry always stores odometer in km. */
export function toDeviceOdometerKm(value: number | undefined | null): number | null {
  if (value == null || !Number.isFinite(value) || value < 0) return null;
  return roundOdometerKm(value);
}

export function roundOdometerKm(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Advances GPS device odometer from guarded GPS distance only.
 * Packet/app odometer fields are ignored — UI manual entry sets the baseline.
 */
export function advanceGpsDeviceOdometerKm(params: {
  currentOdometerKm?: number | null;
  distanceMeters: number;
}): number | null {
  const distanceKm = Math.max(0, params.distanceMeters) / 1000;
  if (distanceKm <= 0) {
    return params.currentOdometerKm != null ? roundOdometerKm(Number(params.currentOdometerKm)) : null;
  }

  return roundOdometerKm(Number(params.currentOdometerKm || 0) + distanceKm);
}
