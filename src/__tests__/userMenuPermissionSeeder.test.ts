import "reflect-metadata";
import { EntityManager } from "@mikro-orm/mysql";
import { logger } from "../configs/logger";
import { MenuItem } from "../domain/entities/mysql/MenuItem";
import { User } from "../domain/entities/mysql/User";
import { UserMenuPermission } from "../domain/entities/mysql/UserMenuPermission";
import { MenuName } from "../domain/enums/MenuName";
import { Status } from "../domain/enums/status";
import { MENU_SEEDS } from "../infrastructure/persistence/seeders/MenuItemSeeder";
import { UserMenuPermissionSeeder } from "../infrastructure/persistence/seeders/UserMenuPermissionSeeder";

type StoredPermission = UserMenuPermission & { id: number };

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
  admin?: User | null;
  menus?: MenuItem[];
  existingPermissions?: Map<string, StoredPermission>;
}) {
  const admin =
    options?.admin === undefined
      ? Object.assign(new User(), {
          id: 1,
          userName: "admin",
          isDeleted: false,
          status: Status.ACTIVE,
        })
      : options.admin;

  const menus =
    options?.menus ??
    MENU_SEEDS.map((seed, index) => makeMenu(index + 1, seed.key));

  const permissions =
    options?.existingPermissions ?? new Map<string, StoredPermission>();
  let nextPermissionId =
    Math.max(0, ...[...permissions.values()].map((p) => p.id)) + 1;

  const em = {
    find: jest.fn(async (entity: unknown) => {
      if (entity === MenuItem) return menus;
      return [];
    }),
    findOne: jest.fn(
      async (entity: unknown, where: Record<string, unknown>) => {
        if (entity === User) {
          if (
            where.userName === "admin" &&
            where.isDeleted === false &&
            where.status === Status.ACTIVE
          ) {
            return admin;
          }
          return null;
        }
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

  return { em, admin, menus, permissions };
}

describe("UserMenuPermissionSeeder", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("gives admin full access on every active menu", async () => {
    const { em, permissions, admin, menus } = makeEm();

    await new UserMenuPermissionSeeder().run(em);

    expect(permissions.size).toBe(menus.length);
    for (const menu of menus) {
      const permission = permissions.get(`${admin!.id}:${menu.id}`)!;
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

  test("does not duplicate permissions on re-run", async () => {
    const { em, permissions } = makeEm();
    const seeder = new UserMenuPermissionSeeder();

    await seeder.run(em);
    const countAfterFirst = permissions.size;
    await seeder.run(em);

    expect(permissions.size).toBe(countAfterFirst);
    expect(permissions.size).toBe(MENU_SEEDS.length);
  });

  test("reactivates soft-deleted admin permission rows", async () => {
    const admin = Object.assign(new User(), {
      id: 1,
      userName: "admin",
      isDeleted: false,
      status: Status.ACTIVE,
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
      admin,
      menus: [home],
      existingPermissions: new Map([["1:10", softDeleted]]),
    });

    await new UserMenuPermissionSeeder().run(em);

    expect(permissions.get("1:10")).toBe(softDeleted);
    expect(softDeleted.isDeleted).toBe(false);
    expect(softDeleted.view).toBe(true);
    expect(softDeleted.status).toBe(Status.ACTIVE);
  });

  test("warns when admin user is missing", async () => {
    const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => logger);
    const { em, permissions } = makeEm({ admin: null });

    await new UserMenuPermissionSeeder().run(em);

    expect(permissions.size).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('active user "admin" not found'),
    );
  });
});
