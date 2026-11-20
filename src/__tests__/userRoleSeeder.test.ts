import "reflect-metadata";
import { EntityManager } from "@mikro-orm/mysql";
import { Role } from "../domain/entities/mysql/Role";
import { Roles, RoleNameMap } from "../domain/enums/Roles";
import { Status } from "../domain/enums/status";
import { UserRoleSeeder } from "../infrastructure/persistence/seeders/UserRoleSeeder";
import { logger } from "../configs/logger";

type StoredRole = Role & { id: number };

function makeEm(existingRoles: StoredRole[] = []) {
  const roles = [...existingRoles];
  let nextId =
    Math.max(0, ...roles.map((role) => role.id).filter(Boolean)) + 1;

  const em = {
    findOne: jest.fn(
      async (_entity: unknown, where: Record<string, unknown>) => {
        const orConditions = where.$or as
          | Array<{ roleCode?: string; name?: string }>
          | undefined;

        if (!orConditions) {
          return null;
        }

        return (
          roles.find((role) =>
            orConditions.some(
              (condition) =>
                (condition.roleCode !== undefined &&
                  role.roleCode === condition.roleCode) ||
                (condition.name !== undefined && role.name === condition.name),
            ),
          ) ?? null
        );
      },
    ),
    persist: jest.fn((role: Role) => {
      if (!(role as StoredRole).id) {
        (role as StoredRole).id = nextId++;
        roles.push(role as StoredRole);
      }
    }),
    flush: jest.fn(async () => undefined),
  } as unknown as EntityManager;

  return { em, roles };
}

describe("UserRoleSeeder", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("seeds all roles with required fields", async () => {
    const { em, roles } = makeEm();

    await new UserRoleSeeder().run(em);

    expect(roles).toHaveLength(Object.keys(Roles).length);
    expect(em.flush).toHaveBeenCalledTimes(1);

    for (const roleCode of Object.values(Roles)) {
      const role = roles.find((item) => item.roleCode === roleCode)!;
      expect(role.name).toBe(RoleNameMap[roleCode]);
      expect(role.status).toBe(Status.ACTIVE);
      expect(role.isDeleted).toBe(false);
      expect(role.externalId).toBeTruthy();
      expect(role.createdAt).toBeInstanceOf(Date);
      expect(role.updatedAt).toBeInstanceOf(Date);
    }
  });

  test("is idempotent and does not create duplicates on re-run", async () => {
    const { em, roles } = makeEm();
    const seeder = new UserRoleSeeder();

    await seeder.run(em);
    const countAfterFirst = roles.length;

    await seeder.run(em);

    expect(roles).toHaveLength(countAfterFirst);
    expect(roles).toHaveLength(Object.keys(Roles).length);
  });

  test("backfills missing roleCode on an existing active role matched by name", async () => {
    const existing = Object.assign(new Role(), {
      id: 1,
      roleCode: "",
      name: RoleNameMap[Roles.ADMIN],
      status: Status.ACTIVE,
      isDeleted: false,
      externalId: "existing-admin",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    }) as StoredRole;

    const { em, roles } = makeEm([existing]);

    await new UserRoleSeeder().run(em);

    expect(roles).toHaveLength(Object.keys(Roles).length);
    expect(existing.roleCode).toBe(Roles.ADMIN);
    expect(em.flush).toHaveBeenCalledTimes(1);
  });

  test("does not recreate a soft-deleted role", async () => {
    const softDeleted = Object.assign(new Role(), {
      id: 1,
      roleCode: Roles.SUPER_ADMIN,
      name: RoleNameMap[Roles.SUPER_ADMIN],
      status: Status.INACTIVE,
      isDeleted: true,
      externalId: "deleted-super-admin",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    }) as StoredRole;

    const infoSpy = jest.spyOn(logger, "info").mockImplementation(() => logger);
    const { em, roles } = makeEm([softDeleted]);

    await new UserRoleSeeder().run(em);

    expect(roles).toHaveLength(Object.keys(Roles).length);
    expect(
      roles.filter((role) => role.roleCode === Roles.SUPER_ADMIN),
    ).toHaveLength(1);
    expect(softDeleted.isDeleted).toBe(true);
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining("soft-deleted"),
    );
  });
});
