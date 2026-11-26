import { CustomAlert } from "../../entities/mysql/CustomAlert";
import { Client } from "../../entities/mysql/Client";

export interface ICustomAlertRepository {
  getCustomAlerts(): Promise<CustomAlert[]>;
  getCustomAlertById(externalId: string): Promise<CustomAlert | null>;
  createCustomAlert(customAlert: CustomAlert): Promise<CustomAlert>;
  updateCustomAlert(customAlert: CustomAlert): Promise<CustomAlert>;
  deleteCustomAlert(externalId: string, deletedBy?: Client): Promise<void>;
}
