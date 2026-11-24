import { injectable } from "tsyringe";
import { IRoleRepository } from "../../../../domain/repositories/mysql/IRoleRepository";
import { EntityManager } from "@mikro-orm/mysql";
import { Role } from "../../../../domain/entities/mysql/Role";
import { Roles } from "../../../../domain/enums/Roles";
import { ensureEmptyRoleMenuPermissions } from "../../../../utils/defaultMenuPermissions";
import { AppError } from "../../../../utils/errors";

@injectable()
export class RoleRepository implements IRoleRepository {
  constructor(private readonly em: EntityManager) {}

  async getRole(): Promise<Role[]> {
    const emFork = this.em.fork();
    return emFork.find(
      Role,
      {
        isDeleted: false,
        roleCode: { $ne: Roles.SUPER_ADMIN },
      },
      { orderBy: { createdAt: "asc" } },
    );
  }

  async getRoleById(externalId: string): Promise<Role | null> {
    const emFork = this.em.fork();
    return await emFork.findOne(Role, {
      externalId: externalId,
      isDeleted: false,
    });
  }

  async getRoleByRoleCode(roleCode: string): Promise<Role | null> {
    const emFork = this.em.fork();
    return await emFork.findOne(Role, { roleCode, isDeleted: false });
  }

  async getDeletedRoleByRoleCode(roleCode: string): Promise<Role | null> {
    const emFork = this.em.fork();
    return await emFork.findOne(Role, { roleCode, isDeleted: true });
  }

  async createRole(role: Role): Promise<Role> {
    const emFork = this.em.fork();
    emFork.persist(role);
    await emFork.flush();
    await ensureEmptyRoleMenuPermissions(emFork, role);
    return role;
  }

  async updateRole(role: Role): Promise<Role> {
    const emFork = this.em.fork();
    const existing = await emFork.findOne(Role, {
      externalId: role.externalId,
      isDeleted: false,
    });
    if (!existing) {
      throw new AppError("role not found", 404);
    }

    existing.roleCode = role.roleCode;
    existing.name = role.name;
    existing.reason = role.reason;
    existing.status = role.status;
    existing.updatedAt = role.updatedAt;

    await emFork.flush();
    return existing;
  }

  async restoreRole(role: Role): Promise<Role> {
    const emFork = this.em.fork();
    const existing = await emFork.findOne(Role, {
      externalId: role.externalId,
      isDeleted: true,
    });
    if (!existing) {
      throw new AppError("role not found", 404);
    }

    existing.isDeleted = false;
    existing.deletedAt = null as unknown as undefined;
    existing.deletedBy = null as unknown as undefined;
    existing.roleCode = role.roleCode;
    existing.name = role.name;
    existing.reason = role.reason;
    existing.status = role.status;
    existing.updatedAt = role.updatedAt;

    await emFork.flush();
    await ensureEmptyRoleMenuPermissions(emFork, existing);
    return existing;
  }

  async deleteRole(externalId: string): Promise<void> {
    const emFork = this.em.fork();

    const role = await emFork.findOne(Role, { externalId, isDeleted: false });

    if (!role) {
      throw new AppError("Role not found", 404);
    }

    role.isDeleted = true;
    role.deletedAt = new Date();
    role.updatedAt = new Date();
    // Free unique roleCode so the same code can be recreated (app checks only isDeleted: false)
    role.roleCode = `${role.roleCode}__del__${role.id}`;

    await emFork.persistAndFlush(role);
  }
}
