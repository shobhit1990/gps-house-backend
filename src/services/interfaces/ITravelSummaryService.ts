import { AddVehicleResponse } from "./IAddVehicleService";
import { TravelSummaryStats } from "../../domain/models/TravelSummary";

export interface TravelSummaryQuery {
  clientId?: string;
  transporterId?: string;
  vehicleId?: string;
  search?: string;
  from: Date;
  to: Date;
}

export type TravelSummaryRow = AddVehicleResponse & {
  sn: number;
  travel: TravelSummaryStats;
};

export interface ITravelSummaryService {
  getTravelSummary(query: TravelSummaryQuery): Promise<TravelSummaryRow[]>;
}
