import {
  CreateAddAlertDto,
  UpdateAddAlertDto,
} from "../../domain/dto/AddAlertFormDto";
import { AddAlertType } from "../../domain/enums/AddAlertType";
import { Status } from "../../domain/enums/status";

export interface AddAlertResponse {
  id: string;
  alertTypes: AddAlertType[];
  overDriveDailyDistance: number | null;
  overDriveWeeklyDistance: number | null;
  underDriveDailyDistance: number | null;
  underDriveWeeklyDistance: number | null;
  mobile: boolean;
  status: Status;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAddAlertService {
  getAddAlerts(): Promise<AddAlertResponse[]>;
  getAddAlertById(externalId: string): Promise<AddAlertResponse>;
  createAddAlert(
    payload: CreateAddAlertDto,
    actorUserId?: number,
  ): Promise<AddAlertResponse>;
  updateAddAlert(
    externalId: string,
    payload: UpdateAddAlertDto,
    actorUserId?: number,
  ): Promise<AddAlertResponse>;
  deleteAddAlert(externalId: string, actorUserId?: number): Promise<void>;
}
