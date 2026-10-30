import { CreateRoleDto, UpdateRoleDto } from "../../domain/dto/RoleDto";
import { Role } from "../../domain/entities/mysql/Role";
import { Status } from "../../domain/enums/status";

export interface RoleResponse {
  id: string;
  roleCode: string;
  name: string | undefined;
  status: Status;
  reason: string | null;
}

export interface IRoleService {
  getRole(): Promise<RoleResponse[]>;

  getRoleById(externalId: string): Promise<RoleResponse>;

  getRoleByRoleCode(roleCode: string): Promise<RoleResponse>;

  createRole(payload: CreateRoleDto): Promise<Role>;

  updateRole(externalId: string, payload: UpdateRoleDto): Promise<Role>;

  updateRoleStatus(
    externalId: string,
    status: Status,
    reason?: string,
  ): Promise<Role>;

  deleteRole(externalId: string): Promise<void>;
}
