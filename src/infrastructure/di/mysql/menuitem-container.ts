import { container } from "tsyringe";
import { IMenuItemRepository } from "../../../domain/repositories/mysql/IMenuItemRepository";
import { MenuItemRepository } from "../../persistence/repositories/mysql/MenuItemRepository";
import { IMenuItemService } from "../../../services/interfaces/IMenuItemService";
import { MenuItemService } from "../../../services/MenuItemService";

export function registerMenuItemDependencies() {
  container.register<IMenuItemRepository>("IMenuItemRepository", {
    useClass: MenuItemRepository,
  });
  container.register<IMenuItemService>("IMenuItemService", {
    useClass: MenuItemService,
  });
}
