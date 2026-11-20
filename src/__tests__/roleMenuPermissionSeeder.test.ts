import "reflect-metadata";
import { EntityManager } from "@mikro-orm/mysql";
import { logger } from "../configs/logger";
import { MenuItem } from "../domain/entities/mysql/MenuItem";
import { Role } from "../domain/entities/mysql/Role";
import { RoleMenuPermission } from "../domain/entities/mysql/RoleMenuPermission";
import { MenuName } from "../domain/enums/MenuName";
import { Roles } from "../domain/enums/Roles";
import { Status } from "../domain/enums/status";
import { MENU_SEEDS } from "../infrastructure/persistence/seeders/MenuItemSeeder";
import { RoleMenuPermissionSeeder } from "../infrastructure/persistence/seeders/RoleMenuPermissionSeeder";

type StoredPermission = RoleMenuPermission & { id: number };

function makeRole(id: number, roleCode: Roles): Role {
  return Object.assign(new Role(), {
    id,
    roleCode,
    name: roleCode,
    status: Status.ACTIVE,
    isDeleted: false,
  });
}

function makeMenu(id: number, key: string): MenuItem {
  return Object.assign(new MenuItem(), {
    id,
    key,
    label: key,
    priority: id,
    status: Status.ACTIVE,
    isDeleted: false,
  });
}

function makeEm(options?: {
  roles?: Role[];
  menus?: MenuItem[];
  existingPermissions?: Map<string, StoredPermission>;
}) {
  const roles =
    options?.roles ??
    [
      Roles.SUPER_ADMIN,
      Roles.ADMIN,
      Roles.CLIENT,
      Roles.TECHNICIAN,
      Roles.TRANSPORTER,
      Roles.USER,
    ].map((code, index) => makeRole(index + 1, code));

  const menus =
    options?.menus ??
    MENU_SEEDS.map((seed, index) => makeMenu(index + 1, seed.key));

  const permissions =
    options?.existingPermissions ?? new Map<string, StoredPermission>();
  let nextPermissionId =
    Math.max(0, ...[...permissions.values()].map((p) => p.id)) + 1;

  const em = {
    find: jest.fn(async (entity: unknown) => {
      if (entity === Role) return roles;
      if (entity === MenuItem) return menus;
      return [];
    }),
    findOne: jest.fn(
      async (entity: unknown, where: Record<string, unknown>) => {
        if (entity === RoleMenuPermission) {
          return permissions.get(`${where.role}:${where.menuItem}`) ?? null;
        }
        return null;
      },
    ),
    persist: jest.fn((entity: RoleMenuPermission) => {
      if (!entity.id) {
        (entity as StoredPermission).id = nextPermissionId++;
      }
      const roleId =
        typeof entity.role === "object" ? entity.role.id : Number(entity.role);
      const menuId =
        typeof entity.menuItem === "object"
          ? entity.menuItem.id
          : Number(entity.menuItem);
      permissions.set(`${roleId}:${menuId}`, entity as StoredPermission);
    }),
    flush: jest.fn(async () => undefined),
  } as unknown as EntityManager;

  return { em, roles, menus, permissions };
}

describe("RoleMenuPermissionSeeder", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("maps every menu to every role", async () => {
    const { em, permissions, roles, menus } = makeEm();

    await new RoleMenuPermissionSeeder().run(em);

    expect(permissions.size).toBe(roles.length * menus.length);
  });

  test("gives SUPER_ADMIN and ADMIN full access on every menu", async () => {
    const { em, permissions, roles, menus } = makeEm();

    await new RoleMenuPermissionSeeder().run(em);

    const superAdmin = roles.find((r) => r.roleCode === Roles.SUPER_ADMIN)!;
    const admin = roles.find((r) => r.roleCode === Roles.ADMIN)!;

    for (const menu of menus) {
      const superPerm = permissions.get(`${superAdmin.id}:${menu.id}`)!;
      const adminPerm = permissions.get(`${admin.id}:${menu.id}`)!;
      expect(superPerm.view).toBe(true);
      expect(superPerm.add).toBe(true);
      expect(superPerm.edit).toBe(true);
      expect(superPerm.delete).toBe(true);
      expect(superPerm.excel).toBe(true);
      expect(adminPerm.delete).toBe(true);
    }
  });

  test("gives other roles all menus with no permissions", async () => {
    const { em, permissions, roles, menus } = makeEm();

    await new RoleMenuPermissionSeeder().run(em);

    const client = roles.find((r) => r.roleCode === Roles.CLIENT)!;
    const user = roles.find((r) => r.roleCode === Roles.USER)!;
    const roleMenu = menus.find((m) => m.key === MenuName.Role)!;

    const clientPerm = permissions.get(`${client.id}:${roleMenu.id}`)!;
    const userPerm = permissions.get(`${user.id}:${roleMenu.id}`)!;

    expect(clientPerm).toBeDefined();
    expect(userPerm).toBeDefined();
    expect(clientPerm.view).toBe(false);
    expect(clientPerm.add).toBe(false);
    expect(clientPerm.edit).toBe(false);
    expect(clientPerm.delete).toBe(false);
    expect(userPerm.view).toBe(false);
    expect(userPerm.excel).toBe(false);
  });

  test("does not duplicate permissions on re-run", async () => {
    const { em, permissions } = makeEm();
    const seeder = new RoleMenuPermissionSeeder();

    await seeder.run(em);
    const countAfterFirst = permissions.size;
    await seeder.run(em);

    expect(permissions.size).toBe(countAfterFirst);
  });

  test("warns when roles are missing", async () => {
    const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => logger);
    const { em } = makeEm({ roles: [], menus: [makeMenu(1, MenuName.Home)] });

    await new RoleMenuPermissionSeeder().run(em);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("no active roles found"),
    );
  });
});
