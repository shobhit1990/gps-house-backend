import { Router } from "express";
import { container } from "tsyringe";
import { OwnerController } from "../../controllers/v1/OwnerController";

const router = Router();
const ownerController = container.resolve(OwnerController);

router.get(
    "/get-all",
    // authorize(MenuName.Role, PermissionAction.View),
    ownerController.getOwner
);

router.get(
    "/get-by-id/:externalId",
    // authorize(MenuName.Role, PermissionAction.View),
    ownerController.getOwnerById
)

router.post(
    "/create",
    // authorize(MenuName.Role, PermissionAction.Add),
    ownerController.createOwner
);

router.put(
    "/update/:externalId",
    // authorize(MenuName.Role, PermissionAction.Edit),
    ownerController.updateOwner
)

router.delete(
  "/delete/:externalId",
//   authorize(MenuName.Role, PermissionAction.Delete),
  ownerController.deleteOwner
);

export default router;