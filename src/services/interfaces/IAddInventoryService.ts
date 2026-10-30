import {
  CreateAddInventoryDto,
  UpdateAddInventoryDto,
} from "../../domain/dto/AddInventoryDto";
import { AssignType } from "../../domain/enums/AssignType";
import { InventoryType } from "../../domain/enums/InventoryType";
import { SimOperator } from "../../domain/enums/SimOperator";
import { Status } from "../../domain/enums/status";

export interface AddInventoryResponse {
  id: string;
  inventoryType: InventoryType;
  imei: string | null;
  simNumber: string | null;
  simOperator: SimOperator;
  secondarySimNumber: string | null;
  secondarySimOperator: SimOperator | null;
  deviceType: { id: string; deviceName: string };
  assignType: AssignType;
  client: { id: string; name: string | null; companyName: string } | null;
  technician: { id: string; name: string | null; companyName: string } | null;
  ignitionWireConnected: boolean;
  airConditionWireConnected: boolean;
  analogSensor: boolean;
  status: Status | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAddInventoryService {
  getAddInventories(): Promise<AddInventoryResponse[]>;

  getAddInventoryById(externalId: string): Promise<AddInventoryResponse>;

  createAddInventory(
    payload: CreateAddInventoryDto,
    actorUserId?: number,
  ): Promise<AddInventoryResponse>;

  updateAddInventory(
    externalId: string,
    payload: UpdateAddInventoryDto,
    actorUserId?: number,
  ): Promise<AddInventoryResponse>;

  deleteAddInventory(externalId: string, actorUserId?: number): Promise<void>;
}
