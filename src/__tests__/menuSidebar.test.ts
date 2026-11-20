import "reflect-metadata";
import { EntityManager } from "@mikro-orm/mysql";
import { MenuItem } from "../domain/entities/mysql/MenuItem";
import { UserMenuPermission } from "../domain/entities/mysql/UserMenuPermission";
import { MenuType } from "../domain/enums/MenuType";
import { Status } from "../domain/enums/status";
import { IMenuItemRepository } from "../domain/repositories/mysql/IMenuItemRepository";
import { IUserMenuPermissionRepository } from "../domain/repositories/mysql/IUserMenuPermissionRepository";
import { MenuItemService } from "../services/MenuItemService";

function makeMenu(
  partial: Partial<MenuItem> &
    Pick<MenuItem, "id" | "key" | "label" | "priority">,
): MenuItem {
  return Object.assign(new MenuItem(), {
    externalId: `menu-${partial.id}`,
    isTitle: false,
    showInMenu: true,
    menuType: MenuType.Web,
    status: Status.ACTIVE,
    isDeleted: false,
    view: true,
    add: true,
    edit: true,
    delete: true,
    filter: true,
    print: true,
    excel: true,
    ...partial,
  });
}

function makePermission(
  menuItem: MenuItem,
  flags: Partial<
    Pick<
      UserMenuPermission,
      "view" | "add" | "edit" | "delete" | "filter" | "print" | "excel"
    >
  > = {},
): UserMenuPermission {
  return Object.assign(new UserMenuPermission(), {
    id: menuItem.id * 10,
    externalId: `perm-${menuItem.id}`,
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
    ...flags,
  });
}

function makeService(input: {
  menus: MenuItem[];
  permissions?: UserMenuPermission[];
}) {
  const menuItemRepository = {
    getMenuByFilter: jest.fn(async () => input.menus),
  } as unknown as IMenuItemRepository;

  const userMenuPermissionRepository = {
    getByUserId: jest.fn(async () => input.permissions ?? []),
  } as unknown as IUserMenuPermissionRepository;

  const em = {
    fork: jest.fn(),
  } as unknown as EntityManager;

  return {
    service: new MenuItemService(
      menuItemRepository,
      userMenuPermissionRepository,
      em,
    ),
    menuItemRepository,
    userMenuPermissionRepository,
  };
}

describe("Menu sidebar", () => {
  test("returns authenticated user sidebar with nested children and priority sorting", async () => {
    const parent = makeMenu({
      id: 1,
      key: "reports",
      label: "Reports",
      priority: 2,
      icon: "reports",
      url: "/reports",
    });
    const childB = makeMenu({
      id: 3,
      key: "stoppage",
      label: "Stoppage",
      priority: 2,
      parent,
      url: "/reports/stoppage",
    });
    const childA = makeMenu({
      id: 2,
      key: "trip",
      label: "Trip",
      priority: 1,
      parent,
      url: "/reports/trip",
    });
    const dashboard = makeMenu({
      id: 4,
      key: "dashboard",
      label: "Dashboard",
      priority: 1,
      icon: "dashboard",
      url: "/dashboard",
    });

    const { service, userMenuPermissionRepository } = makeService({
      menus: [parent, childB, childA, dashboard],
      permissions: [
        makePermission(dashboard, { view: true }),
        makePermission(parent, { view: true, filter: true }),
        makePermission(childA, { view: true, excel: true }),
      ],
    });

    const result = await service.getUserMenus({
      userId: 42,
      allowedMenuTypes: [MenuType.Web, MenuType.Both],
    });

    expect(userMenuPermissionRepository.getByUserId).toHaveBeenCalledWith(42);
    expect(result.map((item) => item.key)).toEqual(["dashboard", "reports"]);
    expect(result[1].children.map((item) => item.key)).toEqual([
      "trip",
      "stoppage",
    ]);
    expect(result[0].permissions).toEqual({
      view: true,
      add: false,
      edit: false,
      delete: false,
      filter: false,
      print: false,
      excel: false,
    });
    expect(result[1].children[0].permissions.excel).toBe(true);
    expect(result[1].children[1].permissions).toEqual({
      view: false,
      add: false,
      edit: false,
      delete: false,
      filter: false,
      print: false,
      excel: false,
    });
  });

  test("uses false permission flags when user has no permission record", async () => {
    const menu = makeMenu({
      id: 5,
      key: "owner",
      label: "Owner",
      priority: 1,
      view: true,
      add: true,
      edit: true,
      delete: true,
      filter: true,
      print: true,
      excel: true,
    });

    const { service } = makeService({ menus: [menu], permissions: [] });
    const result = await service.getUserMenus({ userId: 7 });

    expect(result).toHaveLength(1);
    expect(result[0].permissions).toEqual({
      view: false,
      add: false,
      edit: false,
      delete: false,
      filter: false,
      print: false,
      excel: false,
    });
  });

  test("excludes inactive, deleted, and hidden menus and orphans children safely", async () => {
    const inactiveParent = makeMenu({
      id: 10,
      key: "hidden-parent",
      label: "Hidden Parent",
      priority: 1,
      showInMenu: false,
    });
    const orphanChild = makeMenu({
      id: 11,
      key: "orphan-child",
      label: "Orphan Child",
      priority: 5,
      parent: inactiveParent,
      showInMenu: true,
    });
    const mobileOnly = makeMenu({
      id: 12,
      key: "mobile-home",
      label: "Mobile Home",
      priority: 1,
      menuType: MenuType.Mobile,
    });
    const bothType = makeMenu({
      id: 13,
      key: "shared",
      label: "Shared",
      priority: 2,
      menuType: MenuType.Both,
    });

    // Repository already filters inactive/deleted; service only sees active rows.
    const { service } = makeService({
      menus: [inactiveParent, orphanChild, mobileOnly, bothType],
      permissions: [makePermission(bothType, { view: true, add: true })],
    });

    const result = await service.getUserMenus({
      userId: 9,
      allowedMenuTypes: [MenuType.Web, MenuType.Both],
    });

    expect(result.map((item) => item.key)).toEqual(["shared", "orphan-child"]);
    expect(result[1].parent).toBeNull();
    expect(result[1].children).toEqual([]);
    expect(result[0].permissions).toEqual({
      view: true,
      add: true,
      edit: false,
      delete: false,
      filter: false,
      print: false,
      excel: false,
    });
    expect(result.some((item) => item.key === "mobile-home")).toBe(false);
    expect(result.some((item) => item.key === "hidden-parent")).toBe(false);
  });

  test("treats null parent relation as a root menu", async () => {
    const danglingChild = makeMenu({
      id: 20,
      key: "dangling",
      label: "Dangling",
      priority: 1,
      parent: null as unknown as MenuItem,
    });

    const { service } = makeService({ menus: [danglingChild] });
    const result = await service.getUserMenus({ userId: 3 });

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("dangling");
    expect(result[0].parent).toBeNull();
  });

  test("requires a valid authenticated user id", async () => {
    const { service } = makeService({ menus: [] });
    await expect(service.getUserMenus({ userId: 0 })).rejects.toMatchObject({
      message: "Authenticated user is required",
      statusCode: 401,
    });
  });
});
