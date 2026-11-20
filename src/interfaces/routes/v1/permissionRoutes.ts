import { Router } from "express";
import { container } from "tsyringe";
import { MenuName } from "../../../domain/enums/MenuName";
import { PermissionAction } from "../../../domain/enums/PermissionAction";
import { UserMenuPermissionController } from "../../controllers/v1/UserMenuPermissionController";
import { authenticateUser } from "../../middlewares/userAuthentication";
import { authorize } from "../../middlewares/authorize";

const router = Router();
const controller = container.resolve(UserMenuPermissionController);

router.use(authenticateUser);

router.get(
  "/",
  authorize(MenuName.User, PermissionAction.View),
  controller.getPermissions,
);
router.put(
  "/:id",
  authorize(MenuName.User, PermissionAction.Edit),
  controller.updatePermission,
);

export default router;
