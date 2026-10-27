import { Router } from "express";
import { container } from "tsyringe";
import { MasterController } from "../../controllers/v1/MasterController";

const router = Router();
const masterController = container.resolve(MasterController);

router.get(
  "/owner",
//   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterOwnerList
);

router.get(
  "/language",
//   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterLanguageList
);

router.get(
  "/timeZone",
//   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterLanguageList
);

router.get(
  "/vehicle",
//   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterVehicleList
);

router.get(
  "/client",
//   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterClientList
);

router.get(
  "/technician",
//   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterTechnicianList
);

router.get(
  "/transporter",
//   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterTransporterList
);



export default router;