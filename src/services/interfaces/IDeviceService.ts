import { CreateDeviceDto, UpdateDeviceDto } from "../../domain/dto/DeviceDto";
import { SimOperator } from "../../domain/enums/SimOperator";
import { Status } from "../../domain/enums/status";

export interface DeviceResponse {
  id: string;
  imei: string;
  simNumber: string;
  simOperator: SimOperator;
  secondarySimNumber: string | null;
  secondarySimOperator: SimOperator | null;
  deviceType: { id: string; deviceName: string };
  client: { id: string; name: string | null; companyName: string };
  status: Status;
  reason: string | null;
  ignitionWireConnected: boolean;
  ignitionWireNotConnected: boolean;
  airConditionWireConnected: boolean;
  attendance: boolean;
  timezoneSetting: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceInventoryResponse {
  id: string;
  imei: string;
  simNumber: string | null;
  simOperator: SimOperator;
  secondarySimNumber: string | null;
  secondarySimOperator: SimOperator | null;
  deviceType: { id: string; deviceName: string };
  client: { id: string; name: string | null; companyName: string } | null;
  ignitionWireConnected: boolean;
  airConditionWireConnected: boolean;
}

export interface IDeviceService {
  getDevices(): Promise<DeviceResponse[]>;
  getDeviceById(externalId: string): Promise<DeviceResponse>;
  getAvailableInventories(): Promise<DeviceInventoryResponse[]>;
  getAvailableInventoryByImei(imei: string): Promise<DeviceInventoryResponse>;
  createDevice(
    payload: CreateDeviceDto,
    actorUserId?: number,
  ): Promise<DeviceResponse>;
  updateDevice(
    externalId: string,
    payload: UpdateDeviceDto,
    actorUserId?: number,
  ): Promise<DeviceResponse>;
  deleteDevice(externalId: string, actorUserId?: number): Promise<void>;
}
