import "reflect-metadata";
import { EntityManager } from "@mikro-orm/mysql";
import { MenuItem } from "../domain/entities/mysql/MenuItem";
import { Role } from "../domain/entities/mysql/Role";
import { RoleMenuPermission } from "../domain/entities/mysql/RoleMenuPermission";
import { Status } from "../domain/enums/status";
import { IRoleMenuPermissionRepository } from "../domain/repositories/mysql/IRoleMenuPermissionRepository";
import { RoleMenuPermissionService } from "../services/RoleMenuPermissionService";
import { AppError } from "../utils/errors";

function makeRole(
  partial: Partial<Role> & Pick<Role, "id" | "roleCode" | "name">,
): Role {
  return Object.assign(new Role(), {
    externalId: `role-${partial.id}`,
    isDeleted: false,
    status: Status.ACTIVE,
    ...partial,
  });
}

function makeMenu(
  partial: Partial<MenuItem> & Pick<MenuItem, "id" | "key" | "label">,
): MenuItem {
  return Object.assign(new MenuItem(), {
    externalId: `menu-${partial.id}`,
    priority: 1,
    isDeleted: false,
    status: Status.ACTIVE,
    ...partial,
  });
}

function makePermission(
  role: Role,
  menuItem: MenuItem,
  flags: Partial<
    Pick<
      RoleMenuPermission,
      "view" | "add" | "edit" | "delete" | "filter" | "print" | "excel"
    >
  > = {},
): RoleMenuPermission {
  return Object.assign(new RoleMenuPermission(), {
    id: 20,
    externalId: "role-perm-1",
    role,
    menuItem,
    view: false,
    add: false,
    edit: false,
    delete: false,
    filter: false,
    print: false,
    excel: false,
    status: Status.ACTIVE,
    isDeleted: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...flags,
  });
}

function makeService(overrides?: {
  permissions?: RoleMenuPermission[];
  roles?: Role[];
  menus?: MenuItem[];
}) {
  const permissions = [...(overrides?.permissions ?? [])];
  const roles = overrides?.roles ?? [];
  const menus = overrides?.menus ?? [];

  const permissionRepository = {
    getByExternalId: jest.fn(async (externalId: string) =>
      permissions.find((p) => p.externalId === externalId && !p.isDeleted) ??
      null,
    ),
    getByRoleAndMenuItem: jest.fn(
      async (
        roleId: number,
        menuItemId: number,
        options?: { includeDeleted?: boolean },
      ) =>
        permissions.find(
          (p) =>
            p.role.id === roleId &&
            p.menuItem.id === menuItemId &&
            (options?.includeDeleted || !p.isDeleted),
        ) ?? null,
    ),
    getPaginated: jest.fn(async () => ({
      data: permissions.filter((p) => !p.isDeleted),
      total: permissions.filter((p) => !p.isDeleted).length,
    })),
    create: jest.fn(async (permission: RoleMenuPermission) => {
      permissions.push(permission);
      return permission;
    }),
    update: jest.fn(async (permission: RoleMenuPermission) => permission),
    softDelete: jest.fn(async (externalId: string) => {
      const permission = permissions.find((p) => p.externalId === externalId);
      if (!permission || permission.isDeleted) {
        throw new AppError("Role permission not found", 404);
      }
      permission.isDeleted = true;
      permission.deletedAt = new Date();
    }),
  } as unknown as IRoleMenuPermissionRepository;

  const em = {
    fork: jest.fn(() => ({
      findOne: jest.fn(async (entity: unknown, where: Record<string, unknown>) => {
        if (entity === Role) {
          return (
            roles.find(
              (role) =>
                role.externalId === where.externalId && !role.isDeleted,
            ) ?? null
          );
        }
        if (entity === MenuItem) {
          return (
            menus.find(
              (menu) =>
                menu.externalId === where.externalId && !menu.isDeleted,
            ) ?? null
          );
        }
        return null;
      }),
      find: jest.fn(async () => []),
      persist: jest.fn(),
      flush: jest.fn(async () => undefined),
    })),
  } as unknown as EntityManager;

  return {
    service: new RoleMenuPermissionService(permissionRepository, em),
    permissionRepository,
    permissions,
  };
}

describe("RoleMenuPermissionService", () => {
  const role = makeRole({ id: 3, roleCode: "manager", name: "Manager" });
  const menu = makeMenu({ id: 7, key: "role", label: "Role" });

  test("lists role permissions", async () => {
    const permission = makePermission(role, menu, { view: true, add: true });
    const { service } = makeService({
      permissions: [permission],
      roles: [role],
      menus: [menu],
    });

    const result = await service.getPermissions({ page: 1, limit: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: "role-perm-1",
      view: true,
      add: true,
      role: { id: "role-3", roleCode: "manager", name: "Manager" },
      menuItem: { key: "role", label: "Role" },
    });
  });

  test("updates role permission flags", async () => {
    const permission = makePermission(role, menu, { view: true });
    const { service } = makeService({
      permissions: [permission],
      roles: [role],
      menus: [menu],
    });

    const result = await service.updatePermission("role-perm-1", {
      excel: true,
      print: true,
    });

    expect(result.excel).toBe(true);
    expect(result.print).toBe(true);
    expect(result.view).toBe(true);
  });

  test("throws 404 for missing role permission on update", async () => {
    const { service } = makeService({ roles: [role], menus: [menu] });

    await expect(
      service.updatePermission("missing", { view: false }),
    ).rejects.toMatchObject({
      message: "Role permission not found",
      statusCode: 404,
    });
  });
});
