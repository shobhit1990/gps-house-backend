import "reflect-metadata";
import { EntityManager } from "@mikro-orm/mysql";
import { logger } from "../configs/logger";
import { MenuItem } from "../domain/entities/mysql/MenuItem";
import { Role } from "../domain/entities/mysql/Role";
import { RoleMenuPermission } from "../domain/entities/mysql/RoleMenuPermission";
import { User } from "../domain/entities/mysql/User";
import { UserMenuPermission } from "../domain/entities/mysql/UserMenuPermission";
import { MenuName } from "../domain/enums/MenuName";
import { Roles } from "../domain/enums/Roles";
import { Status } from "../domain/enums/status";
import { MENU_SEEDS } from "../infrastructure/persistence/seeders/MenuItemSeeder";
import { UserMenuPermissionSeeder } from "../infrastructure/persistence/seeders/UserMenuPermissionSeeder";

type StoredPermission = UserMenuPermission & { id: number };

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
  users?: User[];
  menus?: MenuItem[];
  rolePermissions?: RoleMenuPermission[];
  existingPermissions?: Map<string, StoredPermission>;
}) {
  const superAdminRole = makeRole(1, Roles.SUPER_ADMIN);
  const clientRole = makeRole(2, Roles.CLIENT);

  const users =
    options?.users ??
    [
      Object.assign(new User(), {
        id: 1,
        userName: "admin",
        isDeleted: false,
        status: Status.ACTIVE,
        userType: superAdminRole,
      }),
    ];

  const menus =
    options?.menus ??
    MENU_SEEDS.map((seed, index) => makeMenu(index + 1, seed.key));

  const rolePermissions = options?.rolePermissions ?? [];
  const permissions =
    options?.existingPermissions ?? new Map<string, StoredPermission>();
  let nextPermissionId =
    Math.max(0, ...[...permissions.values()].map((p) => p.id)) + 1;

  const em = {
    find: jest.fn(
      async (
        entity: unknown,
        where?: Record<string, unknown>,
        _options?: unknown,
      ) => {
        if (entity === User) {
          return users.filter((user) => {
            if (where?.isDeleted === false && user.isDeleted) return false;
            if (where?.status === Status.ACTIVE && user.status !== Status.ACTIVE) {
              return false;
            }
            return true;
          });
        }
        if (entity === MenuItem) {
          return menus.filter((menu) => !menu.isDeleted);
        }
        if (entity === RoleMenuPermission) {
          return rolePermissions;
        }
        if (entity === UserMenuPermission) {
          const userId = where?.user;
          return [...permissions.values()].filter((permission) => {
            if (where?.isDeleted === false && permission.isDeleted) return false;
            const permissionUserId =
              typeof permission.user === "object"
                ? permission.user.id
                : Number(permission.user);
            return userId === undefined || permissionUserId === userId;
          });
        }
        return [];
      },
    ),
    findOne: jest.fn(
      async (entity: unknown, where: Record<string, unknown>) => {
        if (entity === UserMenuPermission) {
          return permissions.get(`${where.user}:${where.menuItem}`) ?? null;
        }
        return null;
      },
    ),
    persist: jest.fn((entity: UserMenuPermission) => {
      if (!entity.id) {
        (entity as StoredPermission).id = nextPermissionId++;
      }
      const userId =
        typeof entity.user === "object" ? entity.user.id : Number(entity.user);
      const menuId =
        typeof entity.menuItem === "object"
          ? entity.menuItem.id
          : Number(entity.menuItem);
      permissions.set(`${userId}:${menuId}`, entity as StoredPermission);
    }),
    flush: jest.fn(async () => undefined),
  } as unknown as EntityManager;

  return { em, users, menus, permissions, superAdminRole, clientRole };
}

describe("UserMenuPermissionSeeder", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("maps every MENU_SEEDS menu to every active user", async () => {
    const { em, permissions, users, menus } = makeEm();

    await new UserMenuPermissionSeeder().run(em);

    expect(menus.length).toBe(MENU_SEEDS.length);
    expect(permissions.size).toBe(users.length * menus.length);
  });

  test("gives SUPER_ADMIN full access on every active menu", async () => {
    const { em, permissions, users, menus } = makeEm();
    const admin = users[0];

    await new UserMenuPermissionSeeder().run(em);

    for (const menu of menus) {
      const permission = permissions.get(`${admin.id}:${menu.id}`)!;
      expect(permission).toBeDefined();
      expect(permission.view).toBe(true);
      expect(permission.add).toBe(true);
      expect(permission.edit).toBe(true);
      expect(permission.delete).toBe(true);
      expect(permission.filter).toBe(true);
      expect(permission.print).toBe(true);
      expect(permission.excel).toBe(true);
      expect(permission.isDeleted).toBe(false);
      expect(permission.status).toBe(Status.ACTIVE);
    }
  });

  test("copies role permission flags for non-admin users", async () => {
    const clientRole = makeRole(2, Roles.CLIENT);
    const client = Object.assign(new User(), {
      id: 5,
      userName: "client1",
      isDeleted: false,
      status: Status.ACTIVE,
      userType: clientRole,
    });
    const home = makeMenu(1, MenuName.Home);
    const rolePermission = Object.assign(new RoleMenuPermission(), {
      role: clientRole,
      menuItem: home,
      view: true,
      add: false,
      edit: false,
      delete: false,
      filter: true,
      print: false,
      excel: false,
      isDeleted: false,
      status: Status.ACTIVE,
    });

    const { em, permissions } = makeEm({
      users: [client],
      menus: [home],
      rolePermissions: [rolePermission],
    });

    await new UserMenuPermissionSeeder().run(em);

    const permission = permissions.get(`5:1`)!;
    expect(permission.view).toBe(true);
    expect(permission.filter).toBe(true);
    expect(permission.add).toBe(false);
    expect(permission.edit).toBe(false);
  });

  test("does not duplicate permissions on re-run", async () => {
    const { em, permissions } = makeEm();
    const seeder = new UserMenuPermissionSeeder();

    await seeder.run(em);
    const countAfterFirst = permissions.size;
    await seeder.run(em);

    expect(permissions.size).toBe(countAfterFirst);
    expect(permissions.size).toBe(MENU_SEEDS.length);
  });

  test("reactivates soft-deleted permission rows", async () => {
    const admin = Object.assign(new User(), {
      id: 1,
      userName: "admin",
      isDeleted: false,
      status: Status.ACTIVE,
      userType: makeRole(1, Roles.SUPER_ADMIN),
    });
    const home = makeMenu(10, MenuName.Home);
    const softDeleted = Object.assign(new UserMenuPermission(), {
      id: 20,
      user: admin,
      menuItem: home,
      isDeleted: true,
      deletedAt: new Date("2024-01-01"),
      view: false,
      status: Status.INACTIVE,
    }) as StoredPermission;

    const { em, permissions } = makeEm({
      users: [admin],
      menus: [home],
      existingPermissions: new Map([["1:10", softDeleted]]),
    });

    await new UserMenuPermissionSeeder().run(em);

    expect(permissions.get("1:10")).toBe(softDeleted);
    expect(softDeleted.isDeleted).toBe(false);
    expect(softDeleted.view).toBe(true);
    expect(softDeleted.status).toBe(Status.ACTIVE);
  });

  test("soft-deletes permissions for obsolete menus", async () => {
    const admin = Object.assign(new User(), {
      id: 1,
      userName: "admin",
      isDeleted: false,
      status: Status.ACTIVE,
      userType: makeRole(1, Roles.SUPER_ADMIN),
    });
    const home = makeMenu(1, MenuName.Home);
    const obsoleteMenu = makeMenu(99, "manage");
    const obsoletePermission = Object.assign(new UserMenuPermission(), {
      id: 50,
      user: admin,
      menuItem: obsoleteMenu,
      isDeleted: false,
      view: true,
      status: Status.ACTIVE,
    }) as StoredPermission;

    const { em, permissions } = makeEm({
      users: [admin],
      menus: [home],
      existingPermissions: new Map([["1:99", obsoletePermission]]),
    });

    await new UserMenuPermissionSeeder().run(em);

    expect(obsoletePermission.isDeleted).toBe(true);
    expect(obsoletePermission.status).toBe(Status.INACTIVE);
    expect(permissions.get("1:1")).toBeDefined();
  });

  test("warns when no active users exist", async () => {
    const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => logger);
    const { em, permissions } = makeEm({ users: [] });

    await new UserMenuPermissionSeeder().run(em);

    expect(permissions.size).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("no active users found"),
    );
  });
});
