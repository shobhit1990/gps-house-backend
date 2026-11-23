import { PoiFilterType } from "../../domain/enums/PoiFilterType";
import { PoiReportType } from "../../domain/enums/PoiReportType";

export type PoiReportQuery = {
  type: PoiReportType;
  /** Required when type = Vehicle Wise. */
  filterType?: PoiFilterType;
  transporterId?: string;
  vehicleId?: string;
  groupId?: string;
  geofenceId?: string;
  search?: string;
  from: Date;
  to: Date;
};

export type PoiReportResult = {
  type: PoiReportType;
  filterType: PoiFilterType | null;
  data: Record<string, unknown>[];
};

export interface IPoiReportService {
  getPoiReport(query: PoiReportQuery): Promise<PoiReportResult>;
}
