import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import { FormError } from "../domain/dto/FormError";
import { Client } from "../domain/entities/mysql/Client";
import { MenuItem } from "../domain/entities/mysql/MenuItem";
import { MenuType } from "../domain/enums/MenuType";
import { Status } from "../domain/enums/status";
import {
  MenuSidebarItem,
  MenuSidebarResponse,
} from "../domain/models/MenuSidebarResponse";
import { IMenuItemRepository } from "../domain/repositories/mysql/IMenuItemRepository";
import { AppError } from "../utils/errors";
import {
  IMenuItemService,
  MenuItemUpdateRequest,
} from "./interfaces/IMenuItemService";

@injectable()
export class MenuItemService implements IMenuItemService {
  constructor(
    @inject("IMenuItemRepository")
    private readonly menuItemRepository: IMenuItemRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getUserMenus(options?: {
    allowedMenuTypes?: MenuType[];
    includeAllMenus?: boolean;
  }): Promise<MenuSidebarResponse> {
    const menuItems = await this.menuItemRepository.getMenuByFilter(
      ["parent"],
      {},
      [],
    );
    const visibleItems = menuItems.filter((item) => {
      if (!options?.includeAllMenus && !item.showInMenu) {
        return false;
      }

      const allowedTypes = options?.allowedMenuTypes;
      return (
        !allowedTypes?.length ||
        allowedTypes.includes(item.menuType) ||
        item.menuType === MenuType.Both
      );
    });

    const sidebarById = new Map<number, MenuSidebarItem>();
    const parentIds = new Map<number, number | undefined>();

    for (const item of visibleItems) {
      sidebarById.set(item.id, {
        id: item.externalId,
        key: item.key,
        label: item.label,
        icon: item.icon,
        url: item.url,
        isTitle: item.isTitle,
        priority: item.priority,
        menuType: item.menuType,
        parent: item.parent
          ? {
              id: item.parent.externalId,
              key: item.parent.key,
              label: item.parent.label,
              icon: item.parent.icon,
            }
          : null,
        permissions: {
          view: item.view,
          add: item.add,
          edit: item.edit,
          delete: item.delete,
          filter: item.filter,
          print: item.print,
          excel: item.excel,
        },
        children: [],
      });
      parentIds.set(item.id, item.parent?.id);
    }

    const roots: MenuSidebarResponse = [];
    for (const item of visibleItems) {
      const sidebarItem = sidebarById.get(item.id)!;
      const parentId = parentIds.get(item.id);
      const parent =
        parentId === undefined ? undefined : sidebarById.get(parentId);
      if (parent && parentId !== item.id) {
        parent.children.push(sidebarItem);
      } else {
        roots.push(sidebarItem);
      }
    }

    const sortByPriority = (items: MenuSidebarItem[]) => {
      items.sort((left, right) => left.priority - right.priority);
      items.forEach((item) => sortByPriority(item.children));
    };
    sortByPriority(roots);
    return roots;
  }

  async getMenuItems(): Promise<MenuItem[]> {
    return this.menuItemRepository.getMenuByFilter(["parent"], {}, []);
  }

  async getMenuItemById(externalId: string): Promise<MenuItem> {
    const menuItem = await this.menuItemRepository.getMenuItemByFilter(
      ["parent"],
      { externalId },
      [],
    );
    if (!menuItem) {
      throw new AppError("Menu item not found", 404);
    }
    return menuItem;
  }

  async getMenuItemsPaginated(options: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: "asc" | "desc";
  }): Promise<{
    data: MenuItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 10;
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1
    ) {
      throw new AppError("Page and limit must be positive integers", 400);
    }

    const result = await this.menuItemRepository.getMenuByFilterPaginated(
      ["parent"],
      {},
      [],
      { ...options, page, limit },
    );
    return { ...result, page, limit };
  }

  async updateMenuItem(
    externalId: string,
    payload: MenuItemUpdateRequest,
    actorUserId?: number,
  ): Promise<MenuItem> {
    const em = this.em.fork();
    const menuItem = await em.findOne(MenuItem, {
      externalId,
      isDeleted: false,
    });
    if (!menuItem) {
      throw new AppError("Menu item not found", 404);
    }

    const updateData: Partial<MenuItem> = {};
    if (payload.key !== undefined) {
      const key = payload.key.trim();
      if (!key) {
        throw new AppError("Menu key cannot be empty", 400);
      }
      if (key !== menuItem.key) {
        const existing = await em.findOne(MenuItem, { key });
        if (existing && existing.id !== menuItem.id) {
          const error = new FormError();
          error.field = "key";
          error.message = "Menu key already exists";
          throw new AppError(
            "Validation failed. Please check the errors and try again.",
            400,
            null,
            [error],
          );
        }
      }
      updateData.key = key;
    }

    if (payload.label !== undefined) {
      const label = payload.label.trim();
      if (!label) {
        throw new AppError("Menu label cannot be empty", 400);
      }
      updateData.label = label;
    }
    if (payload.priority !== undefined) updateData.priority = payload.priority;
    if (payload.isTitle !== undefined) updateData.isTitle = payload.isTitle;
    if (payload.showInMenu !== undefined) {
      updateData.showInMenu = payload.showInMenu;
    }
    if (payload.icon !== undefined) updateData.icon = payload.icon;
    if (payload.url !== undefined) updateData.url = payload.url;
    if (payload.menuType !== undefined) updateData.menuType = payload.menuType;
    if (payload.view !== undefined) updateData.view = payload.view;
    if (payload.add !== undefined) updateData.add = payload.add;
    if (payload.edit !== undefined) updateData.edit = payload.edit;
    if (payload.delete !== undefined) updateData.delete = payload.delete;
    if (payload.filter !== undefined) updateData.filter = payload.filter;
    if (payload.print !== undefined) updateData.print = payload.print;
    if (payload.excel !== undefined) updateData.excel = payload.excel;
    if (payload.status !== undefined) updateData.status = payload.status;

    if (payload.parentId !== undefined) {
      if (payload.parentId === null) {
        updateData.parent = undefined;
      } else {
        const parent = await em.findOne(MenuItem, {
          externalId: payload.parentId,
          isDeleted: false,
        });
        if (!parent) {
          throw new AppError("Parent menu item not found", 404);
        }
        if (parent.id === menuItem.id) {
          throw new AppError("A menu item cannot be its own parent", 400);
        }
        let ancestorId: number | undefined = parent.id;
        const visitedAncestors = new Set<number>();
        while (ancestorId !== undefined && !visitedAncestors.has(ancestorId)) {
          if (ancestorId === menuItem.id) {
            throw new AppError(
              "A menu item cannot be nested under its own child",
              400,
            );
          }
          visitedAncestors.add(ancestorId);
          const ancestor: MenuItem | null = await em.findOne(MenuItem, {
            id: ancestorId,
            isDeleted: false,
          });
          ancestorId = ancestor?.parent?.id;
        }
        updateData.parent = parent;
      }
    }

    if (actorUserId !== undefined) {
      const actor = await em.findOne(Client, {
        id: actorUserId,
        isDeleted: false,
        status: Status.ACTIVE,
      });
      if (!actor) {
        throw new AppError("User not found", 401);
      }
      updateData.updatedBy = actor;
    }

    return this.menuItemRepository.updateMenuItem(menuItem.id, updateData);
  }
}
