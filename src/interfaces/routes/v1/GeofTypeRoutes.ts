import { Router } from "express";
import { container } from "tsyringe";
import { GeofTypeController } from "../../controllers/v1/GeofTypeController";
import { authenticateUser } from "../../middlewares/userAuthentication";


const router = Router();
const geofTypeController = container.resolve(GeofTypeController);

router.get(
    "/getAll",
    // authorize(MenuName.Role, PermissionAction.View),
    geofTypeController.getGeofType
);

router.get(
    "/getById/:externalId",
    // authorize(MenuName.Role, PermissionAction.View),
    geofTypeController.getGeofTypeById
)

router.post(
    "/create",
    authenticateUser,
    // authorize(MenuName.Role, PermissionAction.Add),
    geofTypeController.createGeofType
);

router.put(
    "/update/:externalId",
    authenticateUser,
    // authorize(MenuName.Role, PermissionAction.Edit),
    geofTypeController.updateGeofType
)

router.delete(
  "/delete/:externalId",
  authenticateUser,
//   authorize(MenuName.Role, PermissionAction.Delete),
  geofTypeController.deleteGeofType
);

export default router;