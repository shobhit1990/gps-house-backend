import { Router } from "express";
import multer from "multer";
import { container } from "tsyringe";
import { DriverDetailController } from "../../controllers/v1/DriverDetailController";
import { authenticateUser } from "../../middlewares/userAuthentication";
import { AppError } from "../../../utils/errors";
import { upload } from "../../../utils/fileUpload";

const router = Router();
const controller = container.resolve(DriverDetailController);
const driverExcelUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    fields: 10,
    files: 1,
    parts: 12,
  },
}).single("file");

router.use(authenticateUser);

router.get("/export", controller.downloadDriverDetailExport);
router.post("/bulk-upload", (req, res, next) => {
  driverExcelUpload(req, res, (error) => {
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
}, controller.bulkUploadDriverDetails);

router.get("/getAll", controller.getDriverDetails);
router.get("/getById/:externalId", controller.getDriverDetailById);
router.post(
  "/",
  (req, res, next) => {
    upload.array("uploadDocument", 10)(req, res, (error) => {
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
  controller.createDriverDetail,
);
router.put(
  "/update/:externalId",
  (req, res, next) => {
    upload.array("uploadDocument", 10)(req, res, (error) => {
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
  controller.updateDriverDetail,
);
router.delete("/delete/:externalId", controller.deleteDriverDetail);

export default router;
