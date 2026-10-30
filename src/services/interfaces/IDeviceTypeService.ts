import {
  CreateDeviceTypeDto,
  UpdateDeviceTypeDto,
} from "../../domain/dto/DeviceTypeDto";
import { Status } from "../../domain/enums/status";

export interface DeviceTypeResponse {
  id: string;
  deviceName: string;
  createdBy: number | null;
  updatedBy: number | null;
  deletedBy: number | null;
  status: Status;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface IDeviceTypeService {
  getDeviceTypes(): Promise<DeviceTypeResponse[]>;

  getDeviceTypeById(externalId: string): Promise<DeviceTypeResponse>;

  createDeviceType(
    payload: CreateDeviceTypeDto,
    actorUserId?: number,
  ): Promise<DeviceTypeResponse>;

  updateDeviceType(
    externalId: string,
    payload: UpdateDeviceTypeDto,
    actorUserId?: number,
  ): Promise<DeviceTypeResponse>;

  deleteDeviceType(externalId: string, actorUserId?: number): Promise<void>;
}
