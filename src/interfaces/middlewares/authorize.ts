import { EntityManager } from "@mikro-orm/mysql";
import { NextFunction, Request, Response } from "express";
import { container } from "tsyringe";
import { UserMenuPermission } from "../../domain/entities/mysql/UserMenuPermission";
import { MenuName } from "../../domain/enums/MenuName";
import { PermissionAction } from "../../domain/enums/PermissionAction";
import { Status } from "../../domain/enums/status";
import { CustomRequest } from "../../domain/models/CustomRequest";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/errors";
import { FULL_ACCESS_USER_ID } from "../../utils/textNormalization";

export function authorize(menu: MenuName, action: PermissionAction) {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      const userId = (req as CustomRequest).userId;
      if (!Number.isSafeInteger(userId) || userId < 1) {
        throw new AppError("Authentication is required", 401);
      }

      if (userId === FULL_ACCESS_USER_ID) {
        next();
        return;
      }

      const em = container.resolve<EntityManager>(EntityManager).fork();
      const permission = await em.findOne(
        UserMenuPermission,
        {
          user: userId,
          menuItem: { key: menu, isDeleted: false },
          isDeleted: false,
          status: Status.ACTIVE,
        },
        { populate: ["menuItem"] },
      );

      if (!permission || permission[action] !== true) {
        throw new AppError(
          "You do not have permission to perform this action",
          403,
        );
      }

      next();
    },
  );
}
