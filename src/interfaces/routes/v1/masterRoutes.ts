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
  masterController.getMasterLanguageList
);

router.get(
  "/timeZone",
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

router.get(
  "/deviceType",
//   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterDeviceTypeList
);

router.get(
  "/expenseType",
//   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterExpenseTypeList
);

router.get(
  "/role",
//   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterRoleList
);

router.get(
  "/user",
//   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterUserList
);

router.get(
  "/group",
//   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterGroupList
);

router.get(
  "/alert",
  masterController.getMasterAlertList
);


export default router;