import "reflect-metadata";
import { EntityManager } from "@mikro-orm/mysql";
import { MenuItem } from "../domain/entities/mysql/MenuItem";
import { MenuName } from "../domain/enums/MenuName";
import { MenuType } from "../domain/enums/MenuType";
import { Status } from "../domain/enums/status";
import {
  MENU_SEEDS,
  MenuItemSeeder,
  validateMenuSeeds,
} from "../infrastructure/persistence/seeders/MenuItemSeeder";

type StoredMenu = MenuItem & { id: number };

function makeEm(options?: { existingMenus?: Map<string, StoredMenu> }) {
  const menus = options?.existingMenus ?? new Map<string, StoredMenu>();
  let nextMenuId = Math.max(0, ...[...menus.values()].map((m) => m.id)) + 1;

  const em = {
    findOne: jest.fn(
      async (entity: unknown, where: Record<string, unknown>) => {
        if (entity === MenuItem) {
          return menus.get(String(where.key)) ?? null;
        }
        return null;
      },
    ),
    persist: jest.fn((entity: MenuItem) => {
      if (entity instanceof MenuItem) {
        if (!entity.id) {
          (entity as StoredMenu).id = nextMenuId++;
        }
        menus.set(entity.key, entity as StoredMenu);
      }
    }),
    flush: jest.fn(async () => undefined),
  } as unknown as EntityManager;

  return { em, menus };
}

describe("MenuItemSeeder", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("MENU_SEEDS keys are unique and parents exist in the seed list", () => {
    const keys = MENU_SEEDS.map((seed) => seed.key);
    expect(new Set(keys).size).toBe(keys.length);

    const keySet = new Set(keys);
    for (const seed of MENU_SEEDS) {
      if (seed.parentKey) {
        expect(keySet.has(seed.parentKey)).toBe(true);
      }
    }
  });

  test("upserts menus without duplicating on re-run", async () => {
    const { em, menus } = makeEm();
    const seeder = new MenuItemSeeder();

    await seeder.run(em);
    const menuCountAfterFirst = menus.size;

    await seeder.run(em);

    expect(menus.size).toBe(menuCountAfterFirst);
    expect(menus.size).toBe(MENU_SEEDS.length);

    const manage = menus.get(MenuName.Manage)!;
    const vehicles = menus.get(MenuName.Vehicles)!;
    expect(vehicles.parent).toBe(manage);
    expect(menus.get(MenuName.Home)!.parent).toBeUndefined();

    expect(vehicles.menuType).toBe(MenuType.Both);
    expect(vehicles.status).toBe(Status.ACTIVE);
    expect(vehicles.view).toBe(true);
    expect(vehicles.add).toBe(true);
  });

  test("reactivates soft-deleted menu rows instead of inserting duplicates", async () => {
    const softDeletedMenu = Object.assign(new MenuItem(), {
      id: 10,
      key: MenuName.Home,
      label: "Old Home",
      priority: 99,
      isDeleted: true,
      deletedAt: new Date("2024-01-01"),
      status: Status.INACTIVE,
      view: false,
    }) as StoredMenu;

    const { em, menus } = makeEm({
      existingMenus: new Map([[MenuName.Home, softDeletedMenu]]),
    });

    await new MenuItemSeeder().run(em);

    expect(menus.get(MenuName.Home)).toBe(softDeletedMenu);
    expect(softDeletedMenu.isDeleted).toBe(false);
    expect(softDeletedMenu.deletedAt).toBeNull();
    expect(softDeletedMenu.status).toBe(Status.ACTIVE);
    expect(softDeletedMenu.label).toBe("Home");
    expect(menus.size).toBe(MENU_SEEDS.length);
  });

  test("throws a clear error when a parent key is missing from MENU_SEEDS", () => {
    expect(() =>
      validateMenuSeeds([
        {
          key: MenuName.Vehicles,
          label: "Vehicles",
          priority: 1,
          parentKey: MenuName.Manage,
        },
      ]),
    ).toThrow(
      /parent menu "manage" for "vehicles" is missing from MENU_SEEDS/i,
    );
  });

  test("throws a clear error when MENU_SEEDS contains duplicate keys", () => {
    expect(() =>
      validateMenuSeeds([
        { key: MenuName.Home, label: "Home", priority: 1 },
        { key: MenuName.Home, label: "Home again", priority: 2 },
      ]),
    ).toThrow(/duplicate menu key "home"/i);
  });
});
