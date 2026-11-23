import { AddVehicleResponse } from "./IAddVehicleService";
import { SpeedDistanceStats } from "../../utils/speedDistance";

export type SpeedDistanceQuery = {
  clientId?: string;
  transporterId?: string;
  vehicleId?: string;
  search?: string;
  from: Date;
  to: Date;
};

export type SpeedDistanceRow = AddVehicleResponse & {
  sn: number;
  vehicleNo: string;
  speedDistance: SpeedDistanceStats;
  /** Flat columns for UI table headers. */
  "0-40 kmph": number;
  "40-60 kmph": number;
  "60-80 kmph": number;
  "80+ kmph": number;
  totalDistanceKms: number;
};

export interface ISpeedDistanceService {
  getSpeedDistanceReport(query: SpeedDistanceQuery): Promise<SpeedDistanceRow[]>;
}
