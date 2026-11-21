import { AddVehicleResponse } from "./IAddVehicleService";
import { TravelSummaryStats } from "../../domain/models/TravelSummary";
import { ReportType } from "../../domain/enums/ReportType";
import { SortOrder } from "../../domain/enums/SortType";

export interface TravelSummaryQuery {
  clientId?: string;
  transporterId?: string;
  vehicleId?: string;
  search?: string;
  from: Date;
  to: Date;
  /** Distance report only; ignored when unset (vehicle-wise, original order). */
  reportType?: ReportType;
  sortOrder?: SortOrder;
}

export type TravelSummaryRow = AddVehicleResponse & {
  sn: number;
  /** Present for day-wise distance reports (local YYYY-MM-DD). */
  date?: string;
  travel: TravelSummaryStats;
};

export interface ITravelSummaryService {
  getTravelSummary(query: TravelSummaryQuery): Promise<TravelSummaryRow[]>;
}
