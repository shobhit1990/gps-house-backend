import "reflect-metadata";
import { EntityManager } from "@mikro-orm/mysql";
import { Role } from "../domain/entities/mysql/Role";
import { User } from "../domain/entities/mysql/User";
import { Roles } from "../domain/enums/Roles";
import { Status } from "../domain/enums/status";
import { UserType } from "../domain/enums/UserType";
import {
  assignUserRole,
  userTypeFromRoleCode,
} from "../utils/userRoleAssignment";

describe("userRoleAssignment", () => {
  test("maps overlapping role codes to UserType", () => {
    expect(userTypeFromRoleCode(Roles.CLIENT)).toBe(UserType.CLIENT);
    expect(userTypeFromRoleCode(Roles.SUPER_ADMIN)).toBe(UserType.SUPER_ADMIN);
  });

  test("assigns role onto userType FK", async () => {
    const role = Object.assign(new Role(), {
      id: 2,
      roleCode: Roles.CLIENT,
      status: Status.ACTIVE,
      isDeleted: false,
    });
    const em = {
      findOne: jest.fn(async () => role),
    } as unknown as EntityManager;
    const user = new User();

    await assignUserRole(em, user, UserType.CLIENT);

    expect(user.userType).toBe(role);
  });

  test("assigns SUPER_ADMIN onto userType FK", async () => {
    const role = Object.assign(new Role(), {
      id: 1,
      roleCode: Roles.SUPER_ADMIN,
      status: Status.ACTIVE,
      isDeleted: false,
    });
    const em = {
      findOne: jest.fn(async () => role),
    } as unknown as EntityManager;
    const user = new User();

    await assignUserRole(em, user, Roles.SUPER_ADMIN);

    expect(user.userType).toBe(role);
    expect(user.userType?.roleCode).toBe(Roles.SUPER_ADMIN);
  });
});
