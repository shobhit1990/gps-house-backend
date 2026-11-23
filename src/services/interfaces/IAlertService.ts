import { CreateAlertDto, UpdateAlertDto } from "../../domain/dto/AddAlertDto";
import { AlertAssignType } from "../../domain/enums/AlertAssignType";
import { NotificationType } from "../../domain/enums/NotificationType";
import { Status } from "../../domain/enums/status";

export interface AlertResponse {
  id: string;
  alertName: string;
  alertAssignedTo: AlertAssignType;
  assignedTo: { id: string; name: string };
  vehicle: { id: string; vehicle: string };
  alertType: { id: string; alertName: string };
  mobile: boolean;
  status: Status;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type AlertListFilter = {
  clientExternalId?: string;
  transporterExternalId?: string;
  vehicleExternalId?: string;
  notification?: NotificationType;
};

export interface IAlertService {
  getAlert(): Promise<{ id: string; alertName: string }[]>;

  getAlerts(filter?: AlertListFilter): Promise<AlertResponse[]>;

  getAlertById(externalId: string): Promise<AlertResponse>;

  createAlert(
    payload: CreateAlertDto,
    actorUserId?: number,
  ): Promise<AlertResponse[]>;

  updateAlert(
    externalId: string,
    payload: UpdateAlertDto,
    actorUserId?: number,
  ): Promise<AlertResponse>;

  deleteAlert(externalId: string, actorUserId?: number): Promise<void>;
}
