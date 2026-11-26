import { AddAlert } from "../../entities/mysql/AddAlert";
import { Client } from "../../entities/mysql/Client";

export interface IAddAlertRepository {
  getAddAlerts(): Promise<AddAlert[]>;
  getAddAlertById(externalId: string): Promise<AddAlert | null>;
  createAddAlert(addAlert: AddAlert): Promise<AddAlert>;
  updateAddAlert(addAlert: AddAlert): Promise<AddAlert>;
  deleteAddAlert(externalId: string, deletedBy?: Client): Promise<void>;
}
