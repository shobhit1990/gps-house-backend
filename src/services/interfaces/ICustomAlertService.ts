import {
  CreateCustomAlertDto,
  UpdateCustomAlertDto,
} from "../../domain/dto/CustomAlertDto";
import { AlertOperation } from "../../domain/enums/AlertOperation";
import { GeofenceRestrictionType } from "../../domain/enums/GeofenceRestrictionType";
import { Status } from "../../domain/enums/status";
import { TripRestrictionType } from "../../domain/enums/TripRestrictionType";

export interface CustomAlertResponse {
  id: string;
  alertName: string;
  sensor: { id: string; sensorName: string } | null;
  operation: AlertOperation;
  value: string;
  enableGeofenceRestrictions: boolean;
  geofenceSelectType: GeofenceRestrictionType | null;
  enableTripRestrictions: boolean;
  tripSelectType: TripRestrictionType | null;
  subject: string;
  messageBody: string;
  mobile: boolean;
  status: Status;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomAlertService {
  getCustomAlerts(): Promise<CustomAlertResponse[]>;
  getCustomAlertById(externalId: string): Promise<CustomAlertResponse>;
  createCustomAlert(
    payload: CreateCustomAlertDto,
    actorUserId?: number,
  ): Promise<CustomAlertResponse>;
  updateCustomAlert(
    externalId: string,
    payload: UpdateCustomAlertDto,
    actorUserId?: number,
  ): Promise<CustomAlertResponse>;
  deleteCustomAlert(externalId: string, actorUserId?: number): Promise<void>;
}
