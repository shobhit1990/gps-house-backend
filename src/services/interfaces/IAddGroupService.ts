import {
  CreateAddGroupDto,
  UpdateAddGroupDto,
} from "../../domain/dto/AddGroupDto";
import { Type } from "../../domain/enums/Type";

export interface AddGroupResponse {
  id: string;
  groupName: string;
  assignedTo: Type;
  status: string | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAddGroupService {
  getAddGroups(): Promise<AddGroupResponse[]>;

  getAddGroupById(externalId: string): Promise<AddGroupResponse>;

  createAddGroup(
    payload: CreateAddGroupDto,
    actorUserId?: number,
  ): Promise<AddGroupResponse>;

  updateAddGroup(
    externalId: string,
    payload: UpdateAddGroupDto,
    actorUserId?: number,
  ): Promise<AddGroupResponse>;

  deleteAddGroup(externalId: string, actorUserId?: number): Promise<void>;
}
