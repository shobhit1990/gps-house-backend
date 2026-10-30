import { Alert } from "../../entities/mysql/Alert";
import { AlertType } from "../../entities/mysql/AlertType";
import { AlertAssignType } from "../../enums/AlertAssignType";
import { Status } from "../../enums/status";

export interface CreateAlertRecord {
  alertName: string;
  alertAssignedTo: AlertAssignType;
  assignedToId: number;
  vehicleId: number;
  alertTypeId: number;
  mobile: boolean;
  status: Status;
  reason?: string;
  createdById?: number;
}

export interface UpdateAlertRecord {
  alertName: string;
  alertAssignedTo: AlertAssignType;
  assignedToId: number;
  vehicleId: number;
  alertTypeId: number;
  mobile: boolean;
  status: Status;
  reason?: string;
  updatedById?: number;
}

export interface IAlertRepository {
  getAlert(): Promise<AlertType[]>;

  createAlerts(records: CreateAlertRecord[]): Promise<Alert[]>;

  getAlerts(): Promise<Alert[]>;

  getAlertById(externalId: string): Promise<Alert | null>;

  updateAlert(externalId: string, record: UpdateAlertRecord): Promise<Alert>;

  deleteAlert(externalId: string, deletedById?: number): Promise<void>;
}
