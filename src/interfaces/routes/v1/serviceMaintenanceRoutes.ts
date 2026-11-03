import { Router } from "express";
import multer from "multer";
import { container } from "tsyringe";
import { ServiceMaintenanceController } from "../../controllers/v1/ServiceMaintenanceController";
import { excelUpload, upload } from "../../../utils/fileUpload";
import { AppError } from "../../../utils/errors";

const router = Router();
const controller = container.resolve(ServiceMaintenanceController);
const parseExcelUpload = excelUpload.single("file");

router.get("/export", controller.downloadServiceMaintenanceExport);
router.post(
  "/bulk-upload",
  (req, res, next) => {
    parseExcelUpload(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        next(new AppError(error.message, 400));
        return;
      }
      if (error) {
        next(error);
        return;
      }
      next();
    });
  },
  controller.bulkUploadServiceMaintenances,
);

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
