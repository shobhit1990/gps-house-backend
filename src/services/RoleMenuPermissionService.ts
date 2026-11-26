import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import { FormError } from "../domain/dto/FormError";
import { UpdateRoleMenuPermissionDto } from "../domain/dto/RoleMenuPermissionDto";
import { Client } from "../domain/entities/mysql/Client";
import { User } from "../domain/entities/mysql/User";
import { MenuItem } from "../domain/entities/mysql/MenuItem";
import { Role } from "../domain/entities/mysql/Role";
import { RoleMenuPermission } from "../domain/entities/mysql/RoleMenuPermission";
import { Status } from "../domain/enums/status";
import { IRoleMenuPermissionRepository } from "../domain/repositories/mysql/IRoleMenuPermissionRepository";
import { syncUserMenuPermissionsFromRolePermission } from "../utils/defaultMenuPermissions";
import { AppError } from "../utils/errors";
import {
  IRoleMenuPermissionService,
  ListRoleMenuPermissionsOptions,
  RoleMenuPermissionListResult,
  RoleMenuPermissionResponse,
} from "./interfaces/IRoleMenuPermissionService";

@injectable()
export class RoleMenuPermissionService implements IRoleMenuPermissionService {
  constructor(
    @inject("IRoleMenuPermissionRepository")
    private readonly permissionRepository: IRoleMenuPermissionRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getPermissions(
    options: ListRoleMenuPermissionsOptions,
  ): Promise<RoleMenuPermissionListResult> {
    let roleId: number | undefined;
    if (options.roleId) {
      const role = await this.findRoleByExternalId(options.roleId);
      roleId = role.id;
    }

    let menuItemId: number | undefined;
    if (options.menuItemId) {
      const menuItem = await this.findMenuItemByExternalId(options.menuItemId);
      menuItemId = menuItem.id;
    }

    const result = await this.permissionRepository.getPaginated({
      page: options.page,
      limit: options.limit,
      search: options.search,
      roleId,
      menuItemId,
      sort: options.sort,
    });

    return {
      data: result.data.map((permission) => this.toResponse(permission)),
      total: result.total,
      ...(options.page !== undefined ? { page: options.page } : {}),
      ...(options.limit !== undefined ? { limit: options.limit } : {}),
    };
  }

  async updatePermission(
    externalId: string,
    payload: UpdateRoleMenuPermissionDto,
    actorUserId?: number,
  ): Promise<RoleMenuPermissionResponse> {
    const permission =
      await this.permissionRepository.getByExternalId(externalId);
    if (!permission) {
      throw new AppError("Role permission not found", 404);
    }

    if (
      payload.roleId === undefined &&
      payload.menuItemId === undefined &&
      payload.view === undefined &&
      payload.add === undefined &&
      payload.edit === undefined &&
      payload.delete === undefined &&
      payload.filter === undefined &&
      payload.print === undefined &&
      payload.excel === undefined &&
      payload.status === undefined
    ) {
      throw new AppError("At least one permission field is required", 400);
    }

    let nextRole = permission.role;
    let nextMenuItem = permission.menuItem;

    if (payload.roleId !== undefined) {
      nextRole = await this.findRoleByExternalId(payload.roleId);
    }
    if (payload.menuItemId !== undefined) {
      nextMenuItem = await this.findMenuItemByExternalId(payload.menuItemId);
    }

    if (
      nextRole.id !== permission.role.id ||
      nextMenuItem.id !== permission.menuItem.id
    ) {
      const duplicate = await this.permissionRepository.getByRoleAndMenuItem(
        nextRole.id,
        nextMenuItem.id,
        { includeDeleted: true },
      );
      if (
        duplicate &&
        duplicate.externalId !== permission.externalId &&
        !duplicate.isDeleted
      ) {
        throw this.duplicatePermissionError();
      }
    }

    permission.role = nextRole;
    permission.menuItem = nextMenuItem;
    this.applyFlags(permission, payload);
    if (payload.status !== undefined) {
      permission.status = payload.status;
    }
    permission.updatedBy = await this.findActor(actorUserId);
    permission.updatedAt = new Date();

    const updated = await this.permissionRepository.update(permission);
    await syncUserMenuPermissionsFromRolePermission(this.em.fork(), updated);
    return this.toResponse(updated);
  }

  private applyFlags(
    permission: RoleMenuPermission,
    payload: Partial<{
      view?: boolean;
      add?: boolean;
      edit?: boolean;
      delete?: boolean;
      filter?: boolean;
      print?: boolean;
      excel?: boolean;
    }>,
  ): void {
    if (payload.view !== undefined) permission.view = payload.view;
    if (payload.add !== undefined) permission.add = payload.add;
    if (payload.edit !== undefined) permission.edit = payload.edit;
    if (payload.delete !== undefined) permission.delete = payload.delete;
    if (payload.filter !== undefined) permission.filter = payload.filter;
    if (payload.print !== undefined) permission.print = payload.print;
    if (payload.excel !== undefined) permission.excel = payload.excel;
  }

  private async findRoleByExternalId(externalId: string): Promise<Role> {
    const role = await this.em.fork().findOne(Role, {
      externalId,
      isDeleted: false,
    });
    if (!role) {
      throw new AppError("Role not found", 404);
    }
    return role;
  }

  private async findMenuItemByExternalId(
    externalId: string,
  ): Promise<MenuItem> {
    const menuItem = await this.em.fork().findOne(MenuItem, {
      externalId,
      isDeleted: false,
    });
    if (!menuItem) {
      throw new AppError("Menu item not found", 404);
    }
    return menuItem;
  }

  /**
   * Auth gives `users.id`. Audit FKs point at `client`, so resolve via matching
   * externalId. Platform admins have no client row — createdBy/updatedBy stay unset.
   */
  private async findActor(userId?: number): Promise<Client | undefined> {
    if (userId === undefined) return undefined;
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new AppError("Invalid user ID", 401);
    }

    const em = this.em.fork();
    const authUser = await em.findOne(User, {
      id: userId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!authUser) {
      throw new AppError("User not found", 401);
    }

    return (
      (await em.findOne(Client, {
        externalId: authUser.externalId,
        isDeleted: false,
        status: Status.ACTIVE,
      })) ?? undefined
    );
  }

  private toResponse(
    permission: RoleMenuPermission,
  ): RoleMenuPermissionResponse {
    return {
      id: permission.externalId,
      role: {
        id: permission.role.externalId,
        roleCode: permission.role.roleCode,
        name: permission.role.name ?? null,
      },
      menuItem: {
        id: permission.menuItem.externalId,
        key: permission.menuItem.key,
        label: permission.menuItem.label,
      },
      view: permission.view,
      add: permission.add,
      edit: permission.edit,
      delete: permission.delete,
      filter: permission.filter,
      print: permission.print,
      excel: permission.excel,
      status: permission.status,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  }

  private duplicatePermissionError(): AppError {
    const error = new FormError();
    error.field = "roleId";
    error.message = "Permission already exists for this role and menu item";
    return new AppError(
      "Validation failed. Please check the errors and try again.",
      400,
      null,
      [error],
    );
  }
}
