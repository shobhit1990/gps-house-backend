import "reflect-metadata";
import { EntityManager } from "@mikro-orm/mysql";
import { MenuItem } from "../domain/entities/mysql/MenuItem";
import { User } from "../domain/entities/mysql/User";
import { UserMenuPermission } from "../domain/entities/mysql/UserMenuPermission";
import { Status } from "../domain/enums/status";
import { IUserMenuPermissionRepository } from "../domain/repositories/mysql/IUserMenuPermissionRepository";
import { UserMenuPermissionService } from "../services/UserMenuPermissionService";
import { AppError } from "../utils/errors";

function makeUser(partial: Partial<User> & Pick<User, "id" | "userName">): User {
  return Object.assign(new User(), {
    externalId: `user-${partial.id}`,
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
  user: User,
  menuItem: MenuItem,
  flags: Partial<
    Pick<
      UserMenuPermission,
      "view" | "add" | "edit" | "delete" | "filter" | "print" | "excel"
    >
  > = {},
): UserMenuPermission {
  return Object.assign(new UserMenuPermission(), {
    id: 10,
    externalId: "perm-1",
    user,
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
  permissions?: UserMenuPermission[];
  users?: User[];
  menus?: MenuItem[];
}) {
  const permissions = [...(overrides?.permissions ?? [])];
  const users = overrides?.users ?? [];
  const menus = overrides?.menus ?? [];

  const permissionRepository = {
    getByUserId: jest.fn(),
    getByExternalId: jest.fn(async (externalId: string) =>
      permissions.find((p) => p.externalId === externalId && !p.isDeleted) ??
      null,
    ),
    getByUserAndMenuItem: jest.fn(
      async (
        userId: number,
        menuItemId: number,
        options?: { includeDeleted?: boolean },
      ) =>
        permissions.find(
          (p) =>
            p.user.id === userId &&
            p.menuItem.id === menuItemId &&
            (options?.includeDeleted || !p.isDeleted),
        ) ?? null,
    ),
    getPaginated: jest.fn(async () => ({
      data: permissions.filter((p) => !p.isDeleted),
      total: permissions.filter((p) => !p.isDeleted).length,
    })),
    create: jest.fn(async (permission: UserMenuPermission) => {
      permissions.push(permission);
      return permission;
    }),
    update: jest.fn(async (permission: UserMenuPermission) => permission),
    softDelete: jest.fn(async (externalId: string) => {
      const permission = permissions.find((p) => p.externalId === externalId);
      if (!permission || permission.isDeleted) {
        throw new AppError("Permission not found", 404);
      }
      permission.isDeleted = true;
      permission.deletedAt = new Date();
    }),
  } as unknown as IUserMenuPermissionRepository;

  const em = {
    fork: jest.fn(() => ({
      findOne: jest.fn(async (entity: unknown, where: Record<string, unknown>) => {
        if (entity === User) {
          return (
            users.find(
              (user) =>
                user.externalId === where.externalId && !user.isDeleted,
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
    })),
  } as unknown as EntityManager;

  return {
    service: new UserMenuPermissionService(permissionRepository, em),
    permissionRepository,
    permissions,
  };
}

describe("UserMenuPermissionService", () => {
  const user = makeUser({ id: 2, userName: "alice" });
  const menu = makeMenu({ id: 5, key: "user", label: "User" });

  test("lists permissions with pagination envelope fields", async () => {
    const permission = makePermission(user, menu, { view: true });
    const { service } = makeService({
      permissions: [permission],
      users: [user],
      menus: [menu],
    });

    const result = await service.getPermissions({ page: 1, limit: 10 });

    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.data[0]).toMatchObject({
      id: "perm-1",
      view: true,
      user: { id: "user-2", userName: "alice" },
      menuItem: { id: "menu-5", key: "user", label: "User" },
    });
  });

  test("updates permission flags", async () => {
    const permission = makePermission(user, menu, { view: true });
    const { service, permissionRepository } = makeService({
      permissions: [permission],
      users: [user],
      menus: [menu],
    });

    const result = await service.updatePermission("perm-1", {
      view: true,
      edit: true,
      delete: false,
    });

    expect(result.edit).toBe(true);
    expect(result.delete).toBe(false);
    expect(permissionRepository.update).toHaveBeenCalled();
  });

  test("throws 404 when updating missing permission", async () => {
    const { service } = makeService({ users: [user], menus: [menu] });

    await expect(
      service.updatePermission("missing", { view: true }),
    ).rejects.toMatchObject({
      message: "Permission not found",
      statusCode: 404,
    });
  });
});
