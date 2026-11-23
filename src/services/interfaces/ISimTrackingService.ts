import { AddVehicleResponse } from "./IAddVehicleService";

export type SimTrackingStatusFilter = "All" | "Active" | "Inactive";

export type SimTrackingReportItem = AddVehicleResponse & {
  vehicleNo: string;
  vehicleStatus: string | null;
  createdBy: string | null;
  simNo: string | null;
  consent: string | null;
  startDate: Date | null;
  endDate: Date | null;
  frequencyMinutes: number | null;
};

export type SimTrackingReportQuery = {
  status?: SimTrackingStatusFilter;
  search?: string;
};

export type SimTrackingReportResult = {
  remainingCoins: number;
  filter: {
    status: SimTrackingStatusFilter;
    search: string | null;
  };
  data: SimTrackingReportItem[];
};

export interface ISimTrackingService {
  getSimTrackingReport(
    query?: SimTrackingReportQuery,
  ): Promise<SimTrackingReportResult>;
}
