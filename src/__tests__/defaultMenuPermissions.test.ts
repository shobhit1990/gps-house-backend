import "reflect-metadata";
import { EntityManager } from "@mikro-orm/mysql";
import { MenuItem } from "../domain/entities/mysql/MenuItem";
import { Role } from "../domain/entities/mysql/Role";
import { RoleMenuPermission } from "../domain/entities/mysql/RoleMenuPermission";
import { User } from "../domain/entities/mysql/User";
import { UserMenuPermission } from "../domain/entities/mysql/UserMenuPermission";
import { Status } from "../domain/enums/status";
import {
  ensureEmptyRoleMenuPermissions,
  ensureUserMenuPermissionsFromRole,
  syncUserMenuPermissionsFromRolePermission,
} from "../utils/defaultMenuPermissions";

describe("defaultMenuPermissions", () => {
  test("creates role permissions with all flags false for every menu", async () => {
    const role = Object.assign(new Role(), { id: 5 });
    const menus = [
      Object.assign(new MenuItem(), { id: 1, key: "home" }),
      Object.assign(new MenuItem(), { id: 2, key: "settings" }),
    ];
    const created: RoleMenuPermission[] = [];

    const em = {
      find: jest.fn(async (entity: unknown) => {
        if (entity === MenuItem) return menus;
        if (entity === RoleMenuPermission) return [];
        return [];
      }),
      persist: jest.fn((permission: RoleMenuPermission) => {
        created.push(permission);
      }),
      flush: jest.fn(async () => undefined),
    } as unknown as EntityManager;

    await ensureEmptyRoleMenuPermissions(em, role);

    expect(created).toHaveLength(2);
    for (const permission of created) {
      expect(permission.role).toBe(role);
      expect(permission.view).toBe(false);
      expect(permission.add).toBe(false);
      expect(permission.status).toBe(Status.ACTIVE);
    }
  });

  test("copies user permissions from the user's role permissions", async () => {
    const role = Object.assign(new Role(), { id: 2, roleCode: "ADMIN" });
    const menu = Object.assign(new MenuItem(), { id: 3, key: "home" });
    const user = Object.assign(new User(), { id: 9, userType: role });
    const rolePermission = Object.assign(new RoleMenuPermission(), {
      role,
      menuItem: menu,
      view: true,
      add: true,
      edit: true,
      delete: true,
      filter: true,
      print: true,
      excel: true,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    const created: UserMenuPermission[] = [];

    const em = {
      find: jest.fn(async (entity: unknown) => {
        if (entity === UserMenuPermission) return [];
        if (entity === RoleMenuPermission) return [rolePermission];
        return [];
      }),
      persist: jest.fn((permission: UserMenuPermission) => {
        created.push(permission);
      }),
      flush: jest.fn(async () => undefined),
    } as unknown as EntityManager;

    await ensureUserMenuPermissionsFromRole(em, user);

    expect(created).toHaveLength(1);
    expect(created[0].user).toBe(user);
    expect(created[0].menuItem).toBe(menu);
    expect(created[0].view).toBe(true);
    expect(created[0].add).toBe(true);
    expect(created[0].delete).toBe(true);
    expect(created[0].excel).toBe(true);
  });

  test("falls back to empty flags when user has no role permissions", async () => {
    const user = Object.assign(new User(), { id: 9 });
    const menus = [Object.assign(new MenuItem(), { id: 3, key: "home" })];
    const created: UserMenuPermission[] = [];

    const em = {
      find: jest.fn(async (entity: unknown) => {
        if (entity === MenuItem) return menus;
        if (entity === UserMenuPermission) return [];
        if (entity === RoleMenuPermission) return [];
        return [];
      }),
      persist: jest.fn((permission: UserMenuPermission) => {
        created.push(permission);
      }),
      flush: jest.fn(async () => undefined),
    } as unknown as EntityManager;

    await ensureUserMenuPermissionsFromRole(em, user);

    expect(created).toHaveLength(1);
    expect(created[0].view).toBe(false);
    expect(created[0].excel).toBe(false);
  });

  test("syncs role permission changes onto users with that role", async () => {
    const role = Object.assign(new Role(), { id: 2, roleCode: "USER" });
    const menu = Object.assign(new MenuItem(), { id: 4, key: "home" });
    const user = Object.assign(new User(), { id: 11, userType: role });
    const rolePermission = Object.assign(new RoleMenuPermission(), {
      role,
      menuItem: menu,
      view: true,
      add: true,
      edit: false,
      delete: false,
      filter: true,
      print: false,
      excel: false,
      status: Status.ACTIVE,
      isDeleted: false,
    });
    const existingUserPerm = Object.assign(new UserMenuPermission(), {
      user,
      menuItem: menu,
      view: false,
      add: false,
      isDeleted: false,
    });
    const created: UserMenuPermission[] = [];

    const em = {
      find: jest.fn(async (entity: unknown) => {
        if (entity === User) return [user];
        return [];
      }),
      findOne: jest.fn(async () => existingUserPerm),
      persist: jest.fn((permission: UserMenuPermission) => {
        created.push(permission);
      }),
      flush: jest.fn(async () => undefined),
    } as unknown as EntityManager;

    await syncUserMenuPermissionsFromRolePermission(em, rolePermission);

    expect(existingUserPerm.view).toBe(true);
    expect(existingUserPerm.add).toBe(true);
    expect(existingUserPerm.filter).toBe(true);
    expect(created).toContain(existingUserPerm);
  });

  test("skips menus that already have a permission row", async () => {
    const role = Object.assign(new Role(), { id: 5 });
    const menuA = Object.assign(new MenuItem(), { id: 1, key: "home" });
    const menuB = Object.assign(new MenuItem(), { id: 2, key: "settings" });
    const existing = Object.assign(new RoleMenuPermission(), {
      role,
      menuItem: menuA,
      view: true,
    });
    const created: RoleMenuPermission[] = [];

    const em = {
      find: jest.fn(async (entity: unknown) => {
        if (entity === MenuItem) return [menuA, menuB];
        if (entity === RoleMenuPermission) return [existing];
        return [];
      }),
      persist: jest.fn((permission: RoleMenuPermission) => {
        created.push(permission);
      }),
      flush: jest.fn(async () => undefined),
    } as unknown as EntityManager;

    await ensureEmptyRoleMenuPermissions(em, role);

    expect(created).toHaveLength(1);
    expect(created[0].menuItem).toBe(menuB);
    expect(created[0].view).toBe(false);
  });
});
