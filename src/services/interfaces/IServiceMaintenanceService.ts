import {
  CreateServiceMaintenanceDto,
  UpdateServiceMaintenanceDto,
} from "../../domain/dto/ServiceMaintenanceDto";
import { Status } from "../../domain/enums/status";

export interface ServiceMaintenanceResponse {
  id: string;
  serviceName: string;
  vehicle: { id: string; vehicle: string };
  remark: string | null;
  odometerIntervalEnabled: boolean;
  odometerInterval: number | null;
  lastServiceOdometer: number | null;
  engineIntervalEnabled: boolean;
  engineInterval: number | null;
  lastServiceEngine: number | null;
  daysIntervalEnabled: boolean;
  daysInterval: number | null;
  lastServiceDate: string | null;
  odometerLeftEnabled: boolean;
  odometerLeft: number | null;
  engineLeftEnabled: boolean;
  engineLeft: number | null;
  daysLeftEnabled: boolean;
  daysLeft: number | null;
  updateRecord: boolean;
  mobile: boolean;
  serviceDocument: string | null;
  allowVisibilityToDriver: boolean;
  status: Status;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IServiceMaintenanceService {
  getServiceMaintenances(): Promise<ServiceMaintenanceResponse[]>;

  getServiceMaintenanceById(
    externalId: string,
  ): Promise<ServiceMaintenanceResponse>;

  createServiceMaintenance(
    payload: CreateServiceMaintenanceDto,
    actorUserId?: number,
    serviceDocument?: string,
  ): Promise<ServiceMaintenanceResponse>;

  updateServiceMaintenance(
    externalId: string,
    payload: UpdateServiceMaintenanceDto,
    actorUserId?: number,
    serviceDocument?: string,
  ): Promise<ServiceMaintenanceResponse>;

  deleteServiceMaintenance(
    externalId: string,
    actorUserId?: number,
  ): Promise<void>;
}
