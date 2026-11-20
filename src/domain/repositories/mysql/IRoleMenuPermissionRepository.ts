import { Client } from "../../entities/mysql/Client";
import { RoleMenuPermission } from "../../entities/mysql/RoleMenuPermission";

export interface RoleMenuPermissionListOptions {
  page?: number;
  limit?: number;
  search?: string;
  roleId?: number;
  menuItemId?: number;
  sort?: "asc" | "desc";
}

export interface IRoleMenuPermissionRepository {
  getByExternalId(externalId: string): Promise<RoleMenuPermission | null>;

  getByRoleAndMenuItem(
    roleId: number,
    menuItemId: number,
    options?: { includeDeleted?: boolean },
  ): Promise<RoleMenuPermission | null>;

  getPaginated(
    options: RoleMenuPermissionListOptions,
  ): Promise<{ data: RoleMenuPermission[]; total: number }>;

  create(permission: RoleMenuPermission): Promise<RoleMenuPermission>;

  update(permission: RoleMenuPermission): Promise<RoleMenuPermission>;

  softDelete(externalId: string, deletedBy?: Client): Promise<void>;
}
