import { AddGroup } from "../../entities/mysql/AddGroup";
import { Client } from "../../entities/mysql/Client";

export interface IAddGroupRepository {
  getAddGroups(): Promise<AddGroup[]>;

  getAddGroupById(externalId: string): Promise<AddGroup | null>;

  createAddGroup(addGroup: AddGroup): Promise<AddGroup>;

  updateAddGroup(addGroup: AddGroup): Promise<AddGroup>;

  deleteAddGroup(externalId: string, deletedBy?: Client): Promise<void>;
}
