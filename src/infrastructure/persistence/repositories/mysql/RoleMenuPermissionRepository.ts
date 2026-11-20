import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { Client } from "../../../../domain/entities/mysql/Client";
import { MenuItem } from "../../../../domain/entities/mysql/MenuItem";
import { Role } from "../../../../domain/entities/mysql/Role";
import { RoleMenuPermission } from "../../../../domain/entities/mysql/RoleMenuPermission";
import {
  IRoleMenuPermissionRepository,
  RoleMenuPermissionListOptions,
} from "../../../../domain/repositories/mysql/IRoleMenuPermissionRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class RoleMenuPermissionRepository
  implements IRoleMenuPermissionRepository
{
  constructor(private readonly em: EntityManager) {}

  async getByExternalId(
    externalId: string,
  ): Promise<RoleMenuPermission | null> {
    return this.em.fork().findOne(
      RoleMenuPermission,
      { externalId, isDeleted: false },
      { populate: ["role", "menuItem"] },
    );
  }

  async getByRoleAndMenuItem(
    roleId: number,
    menuItemId: number,
    options?: { includeDeleted?: boolean },
  ): Promise<RoleMenuPermission | null> {
    const where: Record<string, unknown> = {
      role: roleId,
      menuItem: menuItemId,
    };
    if (!options?.includeDeleted) {
      where.isDeleted = false;
    }

    return this.em.fork().findOne(RoleMenuPermission, where, {
      populate: ["role", "menuItem"],
    });
  }

  async getPaginated(
    options: RoleMenuPermissionListOptions,
  ): Promise<{ data: RoleMenuPermission[]; total: number }> {
    const emFork = this.em.fork();
    const where: Record<string, any> = { isDeleted: false };

    if (options.roleId) {
      where.role = options.roleId;
    }
    if (options.menuItemId) {
      where.menuItem = options.menuItemId;
    }
    if (options.search) {
      const like = `%${options.search}%`;
      where.$or = [
        { role: { roleCode: { $like: like } } },
        { role: { name: { $like: like } } },
        { menuItem: { key: { $like: like } } },
        { menuItem: { label: { $like: like } } },
      ];
    }

    const sort = options.sort === "desc" ? "desc" : "asc";
    const findOptions: Record<string, unknown> = {
      populate: ["role", "menuItem"],
      orderBy: { createdAt: sort },
    };

    if (options.limit !== undefined) {
      const limit = Math.max(1, options.limit);
      const page = Math.max(1, options.page ?? 1);
      findOptions.limit = limit;
      findOptions.offset = (page - 1) * limit;
    }

    const [data, total] = await emFork.findAndCount(
      RoleMenuPermission,
      where,
      findOptions,
    );

    return { data, total };
  }

  async create(permission: RoleMenuPermission): Promise<RoleMenuPermission> {
    const emFork = this.em.fork();
    if (permission.role?.id) {
      permission.role = emFork.getReference(Role, permission.role.id);
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
    await emFork.populate(permission, ["role", "menuItem"]);
    return permission;
  }

  async update(permission: RoleMenuPermission): Promise<RoleMenuPermission> {
    const emFork = this.em.fork();
    const existing = await emFork.findOne(
      RoleMenuPermission,
      { externalId: permission.externalId },
      { populate: ["role", "menuItem"] },
    );
    if (!existing) {
      throw new AppError("Role permission not found", 404);
    }

    existing.role = emFork.getReference(Role, permission.role.id);
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
    await emFork.populate(existing, ["role", "menuItem"]);
    return existing;
  }

  async softDelete(externalId: string, deletedBy?: Client): Promise<void> {
    const emFork = this.em.fork();
    const permission = await emFork.findOne(RoleMenuPermission, {
      externalId,
      isDeleted: false,
    });
    if (!permission) {
      throw new AppError("Role permission not found", 404);
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
