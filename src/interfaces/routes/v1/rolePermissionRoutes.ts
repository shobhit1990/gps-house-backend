import { Router } from "express";
import { container } from "tsyringe";
import { MenuName } from "../../../domain/enums/MenuName";
import { PermissionAction } from "../../../domain/enums/PermissionAction";
import { RoleMenuPermissionController } from "../../controllers/v1/RoleMenuPermissionController";
import { authenticateUser } from "../../middlewares/userAuthentication";
import { authorize } from "../../middlewares/authorize";

const router = Router();
const controller = container.resolve(RoleMenuPermissionController);

router.use(authenticateUser);

router.get(
  "/",
  authorize(MenuName.Role, PermissionAction.View),
  controller.getPermissions,
);
router.put(
  "/:id",
  authorize(MenuName.Role, PermissionAction.Edit),
  controller.updatePermission,
);

export default router;
