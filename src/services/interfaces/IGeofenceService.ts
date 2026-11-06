import {
  CreateGeofenceDto,
  UpdateGeofenceDto,
} from "../../domain/dto/GeofenceDto";
import { GeofAssignType } from "../../domain/enums/GeofAssignType";
import { Status } from "../../domain/enums/status";
import { TransitTime } from "../../domain/enums/TransitTime";
import { Shapes } from "../../domain/enums/Shapes";

export interface GeofenceResponse {
  id: string;
  name: string;
  type: {
    id: string;
    geofType?: string;
  };
  assignType: GeofAssignType;
  geofenceCode: string | null;
  transitTime: TransitTime | null;
  shapes: Shapes | null;
  latitude: number[];
  longitude: number[];
  status: Status | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGeofenceService {
  getGeofences(): Promise<GeofenceResponse[]>;

  getGeofenceById(externalId: string): Promise<GeofenceResponse>;

  createGeofence(
    payload: CreateGeofenceDto,
    actorUserId?: number,
  ): Promise<GeofenceResponse>;

  updateGeofence(
    externalId: string,
    payload: UpdateGeofenceDto,
    actorUserId?: number,
  ): Promise<GeofenceResponse>;

  deleteGeofence(externalId: string, actorUserId?: number): Promise<void>;
}
