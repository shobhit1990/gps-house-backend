import { UpdateUserMenuPermissionDto } from "../../domain/dto/UserMenuPermissionDto";
import { Status } from "../../domain/enums/status";

export interface UserMenuPermissionResponse {
  id: string;
  user: {
    id: string;
    userName: string;
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

export interface UserMenuPermissionListResult {
  data: UserMenuPermissionResponse[];
  total: number;
  page?: number;
  limit?: number;
}

export interface ListUserMenuPermissionsOptions {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string;
  menuItemId?: string;
  sort?: "asc" | "desc";
}

export interface IUserMenuPermissionService {
  getPermissions(
    options: ListUserMenuPermissionsOptions,
  ): Promise<UserMenuPermissionListResult>;

  updatePermission(
    externalId: string,
    payload: UpdateUserMenuPermissionDto,
    actorUserId?: number,
  ): Promise<UserMenuPermissionResponse>;
}
