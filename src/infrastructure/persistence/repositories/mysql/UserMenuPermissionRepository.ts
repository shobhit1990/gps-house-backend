import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { Client } from "../../../../domain/entities/mysql/Client";
import { MenuItem } from "../../../../domain/entities/mysql/MenuItem";
import { User } from "../../../../domain/entities/mysql/User";
import { UserMenuPermission } from "../../../../domain/entities/mysql/UserMenuPermission";
import { Status } from "../../../../domain/enums/status";
import {
  IUserMenuPermissionRepository,
  UserMenuPermissionListOptions,
} from "../../../../domain/repositories/mysql/IUserMenuPermissionRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class UserMenuPermissionRepository
  implements IUserMenuPermissionRepository
{
  constructor(private readonly em: EntityManager) {}

  async getByUserId(userId: number): Promise<UserMenuPermission[]> {
    if (!Number.isSafeInteger(userId) || userId < 1) {
      throw new AppError("Authenticated user is required", 401);
    }

    return this.em.fork().find(
      UserMenuPermission,
      {
        user: userId,
        isDeleted: false,
        status: Status.ACTIVE,
      },
      { populate: ["menuItem"] },
    );
  }

  async getByExternalId(
    externalId: string,
  ): Promise<UserMenuPermission | null> {
    return this.em.fork().findOne(
      UserMenuPermission,
      { externalId, isDeleted: false },
      { populate: ["user", "menuItem"] },
    );
  }

  async getByUserAndMenuItem(
    userId: number,
    menuItemId: number,
    options?: { includeDeleted?: boolean },
  ): Promise<UserMenuPermission | null> {
    const where: Record<string, unknown> = {
      user: userId,
      menuItem: menuItemId,
    };
    if (!options?.includeDeleted) {
      where.isDeleted = false;
    }

    return this.em.fork().findOne(UserMenuPermission, where, {
      populate: ["user", "menuItem"],
    });
  }

  async getPaginated(
    options: UserMenuPermissionListOptions,
  ): Promise<{ data: UserMenuPermission[]; total: number }> {
    const emFork = this.em.fork();
    const where: Record<string, any> = { isDeleted: false };

    if (options.userId) {
      where.user = options.userId;
    }
    if (options.menuItemId) {
      where.menuItem = options.menuItemId;
    }
    if (options.search) {
      const like = `%${options.search}%`;
      where.$or = [
        { user: { userName: { $like: like } } },
        { menuItem: { key: { $like: like } } },
        { menuItem: { label: { $like: like } } },
      ];
    }

    const sort = options.sort === "desc" ? "desc" : "asc";
    const findOptions: Record<string, unknown> = {
      populate: ["user", "menuItem"],
      orderBy: { createdAt: sort },
    };

    if (options.limit !== undefined) {
      const limit = Math.max(1, options.limit);
      const page = Math.max(1, options.page ?? 1);
      findOptions.limit = limit;
      findOptions.offset = (page - 1) * limit;
    }

    const [data, total] = await emFork.findAndCount(
      UserMenuPermission,
      where,
      findOptions,
    );

    return { data, total };
  }

  async create(permission: UserMenuPermission): Promise<UserMenuPermission> {
    const emFork = this.em.fork();
    if (permission.user?.id) {
      permission.user = emFork.getReference(User, permission.user.id);
    }
    if (permission.menuItem?.id) {
      permission.menuItem = emFork.getReference(
        MenuItem,
        permission.menuItem.id,
      );
    }
    if (permission.createdBy?.id) {
      permission.createdBy = emFork.getReference(
        Client,
        permission.createdBy.id,
      );
    }
    await emFork.persistAndFlush(permission);
    await emFork.populate(permission, ["user", "menuItem"]);
    return permission;
  }

  async update(permission: UserMenuPermission): Promise<UserMenuPermission> {
    const emFork = this.em.fork();
    const existing = await emFork.findOne(
      UserMenuPermission,
      { externalId: permission.externalId },
      { populate: ["user", "menuItem"] },
    );
    if (!existing) {
      throw new AppError("Permission not found", 404);
    }

    existing.user = emFork.getReference(User, permission.user.id);
    existing.menuItem = emFork.getReference(MenuItem, permission.menuItem.id);
    existing.view = permission.view;
    existing.add = permission.add;
    existing.edit = permission.edit;
    existing.delete = permission.delete;
    existing.filter = permission.filter;
    existing.print = permission.print;
    existing.excel = permission.excel;
    existing.status = permission.status;
    existing.isDeleted = permission.isDeleted;
    existing.deletedAt = permission.deletedAt;
    existing.deletedBy = permission.deletedBy;
    existing.updatedAt = new Date();
    if (permission.updatedBy?.id) {
      existing.updatedBy = emFork.getReference(Client, permission.updatedBy.id);
    }

    await emFork.flush();
    await emFork.populate(existing, ["user", "menuItem"]);
    return existing;
  }

  async softDelete(externalId: string, deletedBy?: Client): Promise<void> {
    const emFork = this.em.fork();
    const permission = await emFork.findOne(UserMenuPermission, {
      externalId,
      isDeleted: false,
    });
    if (!permission) {
      throw new AppError("Permission not found", 404);
    }

    permission.isDeleted = true;
    permission.deletedAt = new Date();
    permission.updatedAt = new Date();
    if (deletedBy) {
      permission.deletedBy = emFork.getReference(Client, deletedBy.id);
    }
    await emFork.flush();
  }
}
