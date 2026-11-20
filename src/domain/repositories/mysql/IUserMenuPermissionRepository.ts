import { Client } from "../../entities/mysql/Client";
import { UserMenuPermission } from "../../entities/mysql/UserMenuPermission";

export interface UserMenuPermissionListOptions {
  page?: number;
  limit?: number;
  search?: string;
  userId?: number;
  menuItemId?: number;
  sort?: "asc" | "desc";
}

export interface IUserMenuPermissionRepository {
  getByUserId(userId: number): Promise<UserMenuPermission[]>;

  getByExternalId(externalId: string): Promise<UserMenuPermission | null>;

  getByUserAndMenuItem(
    userId: number,
    menuItemId: number,
    options?: { includeDeleted?: boolean },
  ): Promise<UserMenuPermission | null>;

  getPaginated(
    options: UserMenuPermissionListOptions,
  ): Promise<{ data: UserMenuPermission[]; total: number }>;

  create(permission: UserMenuPermission): Promise<UserMenuPermission>;

  update(permission: UserMenuPermission): Promise<UserMenuPermission>;

  softDelete(externalId: string, deletedBy?: Client): Promise<void>;
}
