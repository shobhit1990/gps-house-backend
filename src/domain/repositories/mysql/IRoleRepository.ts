import { Role } from "../../entities/mysql/Role";

export interface IRoleRepository {
  getRole(): Promise<Role[]>;

  getRoleById(externalId: string): Promise<Role | null>;

  getRoleByRoleCode(roleCode: string): Promise<Role | null>;

  createRole(role: Role): Promise<Role>;

  updateRole(role: Role): Promise<Role>;

  deleteRole(externalId: string): Promise<void>;
}
