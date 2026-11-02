import {
  CreateVehicleConfigDto,
  UpdateVehicleConfigDto,
} from "../../domain/dto/VehicleConfigDto";
import { Status } from "../../domain/enums/status";

export interface VehicleConfigResponse {
  id: string;
  transporter: {
    id: string;
    companyName: string;
    name: string | null;
  };
  distanceVariation: number;
  lockButton: boolean;
  status: Status | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVehicleConfigService {
  getVehicleConfigs(): Promise<VehicleConfigResponse[]>;

  getVehicleConfigById(externalId: string): Promise<VehicleConfigResponse>;

  createVehicleConfig(
    payload: CreateVehicleConfigDto,
    actorUserId?: number,
  ): Promise<VehicleConfigResponse>;

  updateVehicleConfig(
    externalId: string,
    payload: UpdateVehicleConfigDto,
    actorUserId?: number,
  ): Promise<VehicleConfigResponse>;

  deleteVehicleConfig(externalId: string, actorUserId?: number): Promise<void>;
}
