import { injectable } from "tsyringe";
import { EntityManager } from "@mikro-orm/mysql";
import { Client } from "../../../../domain/entities/mysql/Client";
import { MenuItem } from "../../../../domain/entities/mysql/MenuItem";
import { IMenuItemRepository } from "../../../../domain/repositories/mysql/IMenuItemRepository";
import { Status } from "../../../../domain/enums/status";
import { AppError } from "../../../../utils/errors";

@injectable()
export class MenuItemRepository implements IMenuItemRepository {
  constructor(private readonly em: EntityManager) {}

  async getMenuItemByFilter(
    populate: any[] = [],
    filter: Record<string, any> = {},
    _fields: (keyof MenuItem)[] = [],
  ): Promise<MenuItem | null> {
    const emFork = this.em.fork();

    const query: Record<string, any> = {
      isDeleted: false,
      status: Status.ACTIVE,
    };

    if (filter?.id) {
      query.id = filter.id;
    }

    if (filter?.externalId) {
      query.externalId = filter.externalId;
    }

    if (filter?.key) {
      query.key = filter.key;
    }

    const projection: Record<string, any> = {};
    if (populate && populate.length > 0) {
      projection.populate = populate;
    }

    return await emFork.findOne(MenuItem, query, projection);
  }

  async getMenuByFilter(
    populate: any[] = [],
    filter: Record<string, any> = {},
    _fields: (keyof MenuItem)[] = [],
  ): Promise<MenuItem[]> {
    const emFork = this.em.fork();

    const query: Record<string, any> = {
      isDeleted: false,
      status: Status.ACTIVE,
    };

    if (filter?.id) {
      query.id = filter.id;
    }

    const projection: Record<string, any> = {
      orderBy: { priority: "asc" },
    };
    if (populate && populate.length > 0) {
      projection.populate = populate;
    }

    return await emFork.find(MenuItem, query, projection);
  }

  async getMenuByFilterPaginated(
    populate: any[] = [],
    filter: Record<string, any> = {},
    _fields: (keyof MenuItem)[] = [],
    options: {
      page: number;
      limit: number;
      search?: string;
      sort?: "asc" | "desc";
    },
  ): Promise<{ data: MenuItem[]; total: number }> {
    const emFork = this.em.fork();

    const where: Record<string, any> = {
      isDeleted: false,
      status: Status.ACTIVE,
    };

    if (filter?.id) {
      where.id = filter.id;
    }

    if (options?.search) {
      const like = `%${options.search}%`;
      where.$or = [{ key: { $like: like } }, { label: { $like: like } }];
    }

    const orderBy: Record<string, "asc" | "desc"> = {
      priority: options?.sort ?? "asc",
    };

    const limit = Math.max(1, Number(options.limit || 10));
    const page = Math.max(1, Number(options.page || 1));
    const offset = (page - 1) * limit;

    const projection: Record<string, any> = {
      orderBy,
      limit,
      offset,
    };

    if (populate && populate.length > 0) {
      projection.populate = populate;
    }

    const [data, total] = await emFork.findAndCount(
      MenuItem,
      where,
      projection,
    );
    return { data, total };
  }

  async updateMenuItem(id: number, data: Partial<MenuItem>): Promise<MenuItem> {
    const emFork = this.em.fork();
    const menuItem = await emFork.findOne(MenuItem, { id, isDeleted: false });
    if (!menuItem) {
      throw new AppError("Menu item not found", 404);
    }

    const { parent, updatedBy, ...scalarData } = data;
    emFork.assign(menuItem, scalarData);
    if (Object.prototype.hasOwnProperty.call(data, "parent")) {
      menuItem.parent = parent
        ? emFork.getReference(MenuItem, parent.id)
        : undefined;
    }
    if (Object.prototype.hasOwnProperty.call(data, "updatedBy")) {
      menuItem.updatedBy = updatedBy
        ? emFork.getReference(Client, updatedBy.id)
        : undefined;
    }

    await emFork.flush();
    return menuItem;
  }
}
