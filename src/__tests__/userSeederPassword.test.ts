import "reflect-metadata";
import { EntityManager } from "@mikro-orm/mysql";
import { User } from "../domain/entities/mysql/User";
import { UserSeeder } from "../infrastructure/persistence/seeders/UserSeeder";
import {
  hashPassword,
  isBcryptPasswordHash,
} from "../utils/passwordHash";

describe("UserSeeder password hashing", () => {
  test("hashes password when creating the default admin user", async () => {
    const created: User[] = [];
    const em = {
      findOne: jest.fn(async () => null),
      persist: jest.fn((user: User) => {
        created.push(user);
      }),
      flush: jest.fn(async () => undefined),
    } as unknown as EntityManager;

    await new UserSeeder().run(em);

    expect(created).toHaveLength(1);
    expect(isBcryptPasswordHash(created[0].password)).toBe(true);
    expect(created[0].password).not.toBe("Admin@123456");
    expect(created[0].email).toBeUndefined();
    expect(created[0].phone).toBeUndefined();
  });

  test("repairs plaintext admin password and leaves hashed passwords alone", async () => {
    const plaintextAdmin = Object.assign(new User(), {
      userName: "admin",
      password: "Admin@123456",
    });
    const hashedPassword = await hashPassword("Admin@123456");
    const hashedAdmin = Object.assign(new User(), {
      userName: "admin",
      password: hashedPassword,
    });

    const plaintextEm = {
      findOne: jest.fn(async () => plaintextAdmin),
      persist: jest.fn(),
      flush: jest.fn(async () => undefined),
    } as unknown as EntityManager;
    await new UserSeeder().run(plaintextEm);
    expect(isBcryptPasswordHash(plaintextAdmin.password)).toBe(true);
    expect(plaintextEm.flush).toHaveBeenCalledTimes(1);

    const hashedEm = {
      findOne: jest.fn(async () => hashedAdmin),
      persist: jest.fn(),
      flush: jest.fn(async () => undefined),
    } as unknown as EntityManager;
    await new UserSeeder().run(hashedEm);
    expect(hashedAdmin.password).toBe(hashedPassword);
    expect(hashedEm.flush).not.toHaveBeenCalled();
  });
});
