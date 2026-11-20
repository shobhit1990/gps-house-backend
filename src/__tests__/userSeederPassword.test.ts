import "reflect-metadata";
import { EntityManager } from "@mikro-orm/mysql";
import { Role } from "../domain/entities/mysql/Role";
import { User } from "../domain/entities/mysql/User";
import { Roles } from "../domain/enums/Roles";
import { Status } from "../domain/enums/status";
import { UserSeeder } from "../infrastructure/persistence/seeders/UserSeeder";
import {
  hashPassword,
  isBcryptPasswordHash,
} from "../utils/passwordHash";

function makeSuperAdminRole(): Role {
  return Object.assign(new Role(), {
    id: 1,
    roleCode: Roles.SUPER_ADMIN,
    name: "Super Administrator",
    status: Status.ACTIVE,
    isDeleted: false,
  });
}

function makeEm(options?: {
  existingUser?: User | null;
  role?: Role | null;
}) {
  const role = options?.role === undefined ? makeSuperAdminRole() : options.role;
  const existingUser =
    options?.existingUser === undefined ? null : options.existingUser;
  const created: User[] = [];

  const em = {
    findOne: jest.fn(async (entity: unknown, where: Record<string, unknown>) => {
      if (entity === User) {
        if (where.userName === "admin") {
          return existingUser;
        }
        return null;
      }
      if (entity === Role) {
        if (
          where.roleCode === Roles.SUPER_ADMIN &&
          where.isDeleted === false &&
          where.status === Status.ACTIVE
        ) {
          return role;
        }
        return null;
      }
      return null;
    }),
    persist: jest.fn((user: User) => {
      created.push(user);
    }),
    flush: jest.fn(async () => undefined),
  } as unknown as EntityManager;

  return { em, created };
}

describe("UserSeeder password hashing", () => {
  test("hashes password when creating the default admin user", async () => {
    const { em, created } = makeEm();

    await new UserSeeder().run(em);

    expect(created).toHaveLength(1);
    expect(isBcryptPasswordHash(created[0].password)).toBe(true);
    expect(created[0].password).not.toBe("Admin@123456");
    expect(created[0].email).toBeUndefined();
    expect(created[0].phone).toBeUndefined();
    expect(created[0].userType?.roleCode).toBe(Roles.SUPER_ADMIN);
  });

  test("repairs plaintext admin password and leaves hashed passwords alone", async () => {
    const role = makeSuperAdminRole();
    const plaintextAdmin = Object.assign(new User(), {
      userName: "admin",
      password: "Admin@123456",
      userType: role,
    });
    const hashedPassword = await hashPassword("Admin@123456");
    const hashedAdmin = Object.assign(new User(), {
      userName: "admin",
      password: hashedPassword,
      userType: role,
    });

    const { em: plaintextEm } = makeEm({ existingUser: plaintextAdmin, role });
    await new UserSeeder().run(plaintextEm);
    expect(isBcryptPasswordHash(plaintextAdmin.password)).toBe(true);
    expect(plaintextEm.flush).toHaveBeenCalledTimes(1);

    const { em: hashedEm } = makeEm({ existingUser: hashedAdmin, role });
    await new UserSeeder().run(hashedEm);
    expect(hashedAdmin.password).toBe(hashedPassword);
    expect(hashedEm.flush).not.toHaveBeenCalled();
  });

  test("backfills SUPER_ADMIN role for existing admin without userType", async () => {
    const hashedPassword = await hashPassword("Admin@123456");
    const existingAdmin = Object.assign(new User(), {
      userName: "admin",
      password: hashedPassword,
    });
    const { em } = makeEm({ existingUser: existingAdmin });

    await new UserSeeder().run(em);

    expect(existingAdmin.userType?.roleCode).toBe(Roles.SUPER_ADMIN);
    expect(em.flush).toHaveBeenCalledTimes(1);
  });

  test("relinks admin when userType is not SUPER_ADMIN", async () => {
    const hashedPassword = await hashPassword("Admin@123456");
    const wrongRole = Object.assign(new Role(), {
      id: 2,
      roleCode: Roles.USER,
      status: Status.ACTIVE,
      isDeleted: false,
    });
    const existingAdmin = Object.assign(new User(), {
      userName: "admin",
      password: hashedPassword,
      userType: wrongRole,
    });
    const { em } = makeEm({ existingUser: existingAdmin });

    await new UserSeeder().run(em);

    expect(existingAdmin.userType?.roleCode).toBe(Roles.SUPER_ADMIN);
    expect(em.flush).toHaveBeenCalledTimes(1);
  });
});
