import { GpsLocationData, GpsStatusData } from "../../domain/models/GpsTrackingData";

/** Realtime GPS stage: keeps the Device row's live position current and pushes socket updates. */
export interface IVehicleGpsDeviceService {
  processLocationRealtime(deviceImei: string, payload: GpsLocationData): Promise<void>;
  updateGpsDeviceStatusByImei(deviceImei: string, payload: GpsStatusData): Promise<void>;
}
