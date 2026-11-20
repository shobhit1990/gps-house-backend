import "reflect-metadata";
import { EntityManager } from "@mikro-orm/mysql";
import { NextFunction, Request, Response } from "express";
import { container } from "tsyringe";
import { UserMenuPermission } from "../domain/entities/mysql/UserMenuPermission";
import { MenuName } from "../domain/enums/MenuName";
import { PermissionAction } from "../domain/enums/PermissionAction";
import { Status } from "../domain/enums/status";
import { CustomRequest } from "../domain/models/CustomRequest";
import { authorize } from "../interfaces/middlewares/authorize";
import { AppError } from "../utils/errors";
import { FULL_ACCESS_USER_ID } from "../utils/textNormalization";

async function runMiddleware(
  middleware: ReturnType<typeof authorize>,
  req: Partial<CustomRequest>,
) {
  const res = {} as Response;
  const next = jest.fn() as NextFunction;

  middleware(req as unknown as Request, res, next);
  await new Promise((resolve) => setImmediate(resolve));

  return { next };
}

describe("authorize middleware", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    container.clearInstances();
  });

  test("allows full-access user without permission lookup", async () => {
    const middleware = authorize(MenuName.User, PermissionAction.View);
    const { next } = await runMiddleware(middleware, {
      userId: FULL_ACCESS_USER_ID,
    });

    expect(next).toHaveBeenCalledWith();
  });

  test("allows authorized user with matching permission flag", async () => {
    const findOne = jest.fn(async () =>
      Object.assign(new UserMenuPermission(), {
        view: true,
        status: Status.ACTIVE,
        isDeleted: false,
      }),
    );
    container.registerInstance(EntityManager, {
      fork: () => ({ findOne }),
    } as unknown as EntityManager);

    const middleware = authorize(MenuName.User, PermissionAction.View);
    const { next } = await runMiddleware(middleware, { userId: 42 });

    expect(next).toHaveBeenCalledWith();
    expect(findOne).toHaveBeenCalled();
  });

  test("rejects unauthorized user missing permission flag", async () => {
    const findOne = jest.fn(async () =>
      Object.assign(new UserMenuPermission(), {
        view: false,
        edit: false,
        status: Status.ACTIVE,
        isDeleted: false,
      }),
    );
    container.registerInstance(EntityManager, {
      fork: () => ({ findOne }),
    } as unknown as EntityManager);

    const middleware = authorize(MenuName.User, PermissionAction.Edit);
    const { next } = await runMiddleware(middleware, { userId: 42 });

    expect(next).toHaveBeenCalledTimes(1);
    const error = (next as jest.Mock).mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      message: "You do not have permission to perform this action",
      statusCode: 403,
    });
  });

  test("rejects when authentication context is missing", async () => {
    const middleware = authorize(MenuName.Role, PermissionAction.View);
    const { next } = await runMiddleware(middleware, {});

    expect(next).toHaveBeenCalledTimes(1);
    const error = (next as jest.Mock).mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      message: "Authentication is required",
      statusCode: 401,
    });
  });
});
