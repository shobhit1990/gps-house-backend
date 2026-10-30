import {
  CreateVehicleDetailDto,
  UpdateVehicleDetailDto,
} from "../../domain/dto/VehicleDetailDto";
import { OwnerdBy } from "../../domain/enums/OwnedBy";
import { Status } from "../../domain/enums/status";
import { VehicleBodyType } from "../../domain/enums/VehicleBodyType";

export interface VehicleDetailResponse {
  id: string;
  client: { id: string; name: string | null; companyName: string };
  transporter: { id: string; name: string | null; companyName: string };
  vehicle: { id: string; vehicle: string };
  ownerName: string | null;
  ownedBy: OwnerdBy | null;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  vehicleBody: VehicleBodyType | null;
  capacity: number | null;
  manufactureDate: Date | null;
  purchaseDate: Date | null;
  status: Status | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVehicleDetailService {
  getVehicleDetails(): Promise<VehicleDetailResponse[]>;

  getVehicleDetailById(externalId: string): Promise<VehicleDetailResponse>;

  createVehicleDetail(
    payload: CreateVehicleDetailDto,
    actorUserId?: number,
  ): Promise<VehicleDetailResponse>;

  updateVehicleDetail(
    externalId: string,
    payload: UpdateVehicleDetailDto,
    actorUserId?: number,
  ): Promise<VehicleDetailResponse>;

  deleteVehicleDetail(externalId: string, actorUserId?: number): Promise<void>;
}
