import { Router } from "express";
import { container } from "tsyringe";
import { ServiceMaintenanceController } from "../../controllers/v1/ServiceMaintenanceController";
import { upload } from "../../../utils/fileUpload";

const router = Router();
const controller = container.resolve(ServiceMaintenanceController);

router.get("/getAll", controller.getServiceMaintenances);
router.get("/getById/:externalId", controller.getServiceMaintenanceById);
router.post(
  "/",
  upload.single("serviceDocument"),
  controller.createServiceMaintenance,
);
router.put(
  "/update/:externalId",
  upload.single("serviceDocument"),
  controller.updateServiceMaintenance,
);
router.delete("/delete/:externalId", controller.deleteServiceMaintenance);

export default router;
