import { AddInventory } from "../../entities/mysql/AddInventory";
import { Client } from "../../entities/mysql/Client";

export interface AddInventoryBulkCreateResult {
  insertedRecords: number;
  duplicateRecords: number;
}

export interface IAddInventoryRepository {
  getAddInventories(): Promise<AddInventory[]>;

  getAddInventoryById(externalId: string): Promise<AddInventory | null>;

  createAddInventory(inventory: AddInventory): Promise<AddInventory>;

  bulkCreateAddInventories(
    inventories: AddInventory[],
  ): Promise<AddInventoryBulkCreateResult>;

  updateAddInventory(inventory: AddInventory): Promise<AddInventory>;

  deleteAddInventory(externalId: string, deletedBy?: Client): Promise<void>;
}
