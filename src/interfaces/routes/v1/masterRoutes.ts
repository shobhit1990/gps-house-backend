import { Router } from "express";
import { container } from "tsyringe";
import { MasterController } from "../../controllers/v1/MasterController";

const router = Router();
const masterController = container.resolve(MasterController);

router.get(
  "/owner",
  //   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterOwnerList,
);

router.get("/language", masterController.getMasterLanguageList);

router.get("/state", masterController.getMasterStateList);

router.get("/district", masterController.getMasterDistrictList);

router.get("/timeZone", masterController.getMasterTimeZoneList);

router.get(
  "/vehicle",
  //   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterVehicleList,
);

router.get(
  "/client",
  //   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterClientList,
);

router.get(
  "/technician",
  //   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterTechnicianList,
);

router.get(
  "/transporter",
  //   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterTransporterList,
);

router.get(
  "/deviceType",
  //   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterDeviceTypeList,
);

router.get(
  "/device",
  //   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterDeviceList,
);

router.get(
  "/expenseType",
  //   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterExpenseTypeList,
);

router.get(
  "/role",
  //   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterRoleList,
);

router.get(
  "/user",
  //   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterUserList,
);

router.get(
  "/group",
  //   authorize(MenuName.User, PermissionAction.View),
  masterController.getMasterGroupList,
);

router.get("/alert", masterController.getMasterAlertList);

router.get("/geofType", masterController.getMasterGeofTypeList);

router.get("/geofence", masterController.getMasterGeofenceList);

router.get("/license", masterController.getMasterLicenseList);

export default router;
