import { inject, injectable } from "tsyringe";
import { CreateRoleDto, UpdateRoleDto } from "../domain/dto/RoleDto";
import { FormError } from "../domain/dto/FormError";
import { Role } from "../domain/entities/mysql/Role";
import { Status } from "../domain/enums/status";
import { IRoleRepository } from "../domain/repositories/mysql/IRoleRepository";
import { AppError } from "../utils/errors";
import { assertRoleCanBeMutated } from "../utils/textNormalization";
import { IRoleService, RoleResponse } from "./interfaces/IRoleService";

@injectable()
export class RoleService implements IRoleService {
  constructor(
    @inject("IRoleRepository")
    private readonly roleRepository: IRoleRepository,
  ) {}

  async getRole(): Promise<RoleResponse[]> {
    const roles = await this.roleRepository.getRole();
    return roles.map((role) => this.toResponse(role));
  }

  async getRoleById(externalId: string): Promise<RoleResponse> {
    const role = await this.roleRepository.getRoleById(externalId);
    if (!role) {
      throw new AppError("Role not found", 404);
    }
    return this.toResponse(role);
  }

  async getRoleByRoleCode(roleCode: string): Promise<RoleResponse> {
    const role = await this.roleRepository.getRoleByRoleCode(roleCode.trim());
    if (!role) {
      throw new AppError("Role not found", 404);
    }
    return this.toResponse(role);
  }

  async createRole(payload: CreateRoleDto): Promise<Role> {
    const roleCode = payload.roleCode.trim();
    const existingRole = await this.roleRepository.getRoleByRoleCode(roleCode);
    if (existingRole) {
      throw this.duplicateRoleCodeError();
    }

    const role = new Role();
    role.roleCode = roleCode;
    role.name = payload.name.trim();
    role.status = payload.status ?? Status.ACTIVE;
    role.reason = payload.reason?.trim() || undefined;
    return this.roleRepository.createRole(role);
  }

  async updateRole(externalId: string, payload: UpdateRoleDto): Promise<Role> {
    const role = await this.findRole(externalId);
    assertRoleCanBeMutated(role.id);

    if (payload.roleCode !== undefined) {
      const roleCode = payload.roleCode.trim();
      const existingRole =
        await this.roleRepository.getRoleByRoleCode(roleCode);
      if (existingRole && existingRole.id !== role.id) {
        throw this.duplicateRoleCodeError();
      }
      role.roleCode = roleCode;
    }
    if (payload.name !== undefined) role.name = payload.name.trim();
    if (payload.status !== undefined) role.status = payload.status;
    if (payload.reason !== undefined) {
      role.reason = payload.reason.trim() || undefined;
    }
    role.updatedAt = new Date();
    return this.roleRepository.updateRole(role);
  }

  async updateRoleStatus(
    externalId: string,
    status: Status,
    reason?: string,
  ): Promise<Role> {
    const role = await this.findRole(externalId);
    assertRoleCanBeMutated(role.id);
    role.status = status;
    if (reason !== undefined) role.reason = reason.trim() || undefined;
    role.updatedAt = new Date();
    return this.roleRepository.updateRole(role);
  }

  async deleteRole(externalId: string): Promise<void> {
    const role = await this.findRole(externalId);
    assertRoleCanBeMutated(role.id);
    await this.roleRepository.deleteRole(externalId);
  }

  private async findRole(externalId: string): Promise<Role> {
    const role = await this.roleRepository.getRoleById(externalId);
    if (!role) throw new AppError("Role not found", 404);
    return role;
  }

  private toResponse(role: Role): RoleResponse {
    return {
      id: role.externalId,
      roleCode: role.roleCode,
      name: role.name,
      status: role.status,
      reason: role.reason ?? null,
    };
  }

  private duplicateRoleCodeError(): AppError {
    const error = new FormError();
    error.field = "roleCode";
    error.message = "Role code already exists";
    return new AppError(
      "Validation failed. Please check the errors and try again.",
      400,
      null,
      [error],
    );
  }
}
