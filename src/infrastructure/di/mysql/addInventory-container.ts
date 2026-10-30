import { container } from "tsyringe";
import { IAddInventoryRepository } from "../../../domain/repositories/mysql/IAddInventoryRepository";
import { AddInventoryRepository } from "../../persistence/repositories/mysql/AddInventoryRepository";
import { IAddInventoryService } from "../../../services/interfaces/IAddInventoryService";
import { AddInventoryService } from "../../../services/AddInventoryService";

export function registerAddInventoryDependencies() {
  container.register<IAddInventoryRepository>(
    "IAddInventoryRepository",
    AddInventoryRepository,
  );
  container.register<IAddInventoryService>(
    "IAddInventoryService",
    AddInventoryService,
  );
}
