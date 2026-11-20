import { UpdateRoleMenuPermissionDto } from "../../domain/dto/RoleMenuPermissionDto";
import { Status } from "../../domain/enums/status";

export interface RoleMenuPermissionResponse {
  id: string;
  role: {
    id: string;
    roleCode: string;
    name: string | null;
  };
  menuItem: {
    id: string;
    key: string;
    label: string;
  };
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  filter: boolean;
  print: boolean;
  excel: boolean;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleMenuPermissionListResult {
  data: RoleMenuPermissionResponse[];
  total: number;
  page?: number;
  limit?: number;
}

export interface ListRoleMenuPermissionsOptions {
  page?: number;
  limit?: number;
  search?: string;
  roleId?: string;
  menuItemId?: string;
  sort?: "asc" | "desc";
}

export interface IRoleMenuPermissionService {
  getPermissions(
    options: ListRoleMenuPermissionsOptions,
  ): Promise<RoleMenuPermissionListResult>;

  updatePermission(
    externalId: string,
    payload: UpdateRoleMenuPermissionDto,
    actorUserId?: number,
  ): Promise<RoleMenuPermissionResponse>;
}
