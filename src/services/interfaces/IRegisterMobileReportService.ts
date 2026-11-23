import { MobileReportType } from "../../domain/enums/MobileReportType";
import { Status } from "../../domain/enums/status";

export type RegisterMobileReportQuery = {
  /** Required — select client first. */
  clientId: string;
  /**
   * Required — MobileReportType.
   * `user` → user rows/columns
   * `transporter` → transporter rows/columns
   */
  type: MobileReportType;
  /** Optional — only used when type = transporter. */
  transporterId?: string;
  search?: string;
};

export type RegisterMobileUserRow = {
  sn: number;
  type: MobileReportType.USER;
  id: string;
  username: string;
  activeCount: number;
  status: Status | null;
  name: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  imeiNumber: string | null;
  group: { id: string; groupName: string } | null;
  timezone: { id: string; timeZone: string } | null;
  userType: { id: string; roleCode: string; name: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RegisterMobileTransporterRow = {
  sn: number;
  type: MobileReportType.TRANSPORTER;
  id: string;
  username: string;
  activeCount: number;
  status: Status | null;
  name: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  imeiNumber: string | null;
  address: string | null;
  language: { id: string; languageName: string } | null;
  timezone: { id: string; timeZone: string } | null;
  subscriptionStartDate: Date | null;
  subscriptionDueDate: Date | null;
  subscriptionExtendDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RegisterMobileReportRow =
  | RegisterMobileUserRow
  | RegisterMobileTransporterRow;

export interface IRegisterMobileReportService {
  getRegisterMobileReport(
    query: RegisterMobileReportQuery,
  ): Promise<RegisterMobileReportRow[]>;
}
