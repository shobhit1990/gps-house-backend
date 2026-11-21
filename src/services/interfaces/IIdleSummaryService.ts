import { IdleSummaryStatus } from "../../domain/enums/IdleSummaryStatus";
import { Minutes } from "../../domain/enums/Minutes";

export type IdleSummaryQuery = {
  clientId?: string;
  transporterId?: string;
  vehicleId?: string;
  search?: string;
  durationMinutes: number;
  statuses?: IdleSummaryStatus[];
  from: Date;
  to: Date;
};

export type IdleSummaryRow = {
  sn: number;
  vehicle: {
    id: string;
    vehicleNo: string | null;
    nickname: string | null;
  };
  client: {
    id: string;
    name: string | null;
    companyName: string | null;
  } | null;
  transporter: {
    id: string;
    name: string | null;
    companyName: string | null;
  } | null;
  status: IdleSummaryStatus;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type IdleSummaryDuration = Minutes | number | string;

export interface IIdleSummaryService {
  getIdleSummary(query: IdleSummaryQuery): Promise<IdleSummaryRow[]>;
}
