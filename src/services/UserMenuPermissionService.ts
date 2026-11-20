import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import { FormError } from "../domain/dto/FormError";
import { UpdateUserMenuPermissionDto } from "../domain/dto/UserMenuPermissionDto";
import { Client } from "../domain/entities/mysql/Client";
import { MenuItem } from "../domain/entities/mysql/MenuItem";
import { User } from "../domain/entities/mysql/User";
import { UserMenuPermission } from "../domain/entities/mysql/UserMenuPermission";
import { Status } from "../domain/enums/status";
import { IUserMenuPermissionRepository } from "../domain/repositories/mysql/IUserMenuPermissionRepository";
import { AppError } from "../utils/errors";
import {
  IUserMenuPermissionService,
  ListUserMenuPermissionsOptions,
  UserMenuPermissionListResult,
  UserMenuPermissionResponse,
} from "./interfaces/IUserMenuPermissionService";

@injectable()
export class UserMenuPermissionService implements IUserMenuPermissionService {
  constructor(
    @inject("IUserMenuPermissionRepository")
    private readonly permissionRepository: IUserMenuPermissionRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getPermissions(
    options: ListUserMenuPermissionsOptions,
  ): Promise<UserMenuPermissionListResult> {
    let userId: number | undefined;
    if (options.userId) {
      const user = await this.findUserByExternalId(options.userId);
      userId = user.id;
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
      userId,
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
    payload: UpdateUserMenuPermissionDto,
    actorUserId?: number,
  ): Promise<UserMenuPermissionResponse> {
    const permission =
      await this.permissionRepository.getByExternalId(externalId);
    if (!permission) {
      throw new AppError("Permission not found", 404);
    }

    if (
      payload.userId === undefined &&
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

    let nextUser = permission.user;
    let nextMenuItem = permission.menuItem;

    if (payload.userId !== undefined) {
      nextUser = await this.findUserByExternalId(payload.userId);
    }
    if (payload.menuItemId !== undefined) {
      nextMenuItem = await this.findMenuItemByExternalId(payload.menuItemId);
    }

    if (
      nextUser.id !== permission.user.id ||
      nextMenuItem.id !== permission.menuItem.id
    ) {
      const duplicate = await this.permissionRepository.getByUserAndMenuItem(
        nextUser.id,
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

    permission.user = nextUser;
    permission.menuItem = nextMenuItem;
    this.applyFlags(permission, payload);
    if (payload.status !== undefined) {
      permission.status = payload.status;
    }
    permission.updatedBy = await this.findActor(actorUserId);
    permission.updatedAt = new Date();

    const updated = await this.permissionRepository.update(permission);
    return this.toResponse(updated);
  }

  private applyFlags(
    permission: UserMenuPermission,
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

  private async findUserByExternalId(externalId: string): Promise<User> {
    const user = await this.em.fork().findOne(User, {
      externalId,
      isDeleted: false,
    });
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return user;
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

  private async findActor(userId?: number): Promise<Client | undefined> {
    if (userId === undefined) return undefined;
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new AppError("Invalid user ID", 401);
    }

    const actor = await this.em.fork().findOne(Client, {
      id: userId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    return actor ?? undefined;
  }

  private toResponse(
    permission: UserMenuPermission,
  ): UserMenuPermissionResponse {
    return {
      id: permission.externalId,
      user: {
        id: permission.user.externalId,
        userName: permission.user.userName,
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
    error.field = "userId";
    error.message = "Permission already exists for this user and menu item";
    return new AppError(
      "Validation failed. Please check the errors and try again.",
      400,
      null,
      [error],
    );
  }
}
