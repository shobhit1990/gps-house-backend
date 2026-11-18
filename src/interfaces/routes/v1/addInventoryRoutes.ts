import { Router } from "express";
import multer from "multer";
import { container } from "tsyringe";
import { AddInventoryController } from "../../controllers/v1/AddInventoryController";
import { AppError } from "../../../utils/errors";

const router = Router();
const controller = container.resolve(AddInventoryController);
const inventoryExcelUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    fields: 10,
    files: 1,
    parts: 12,
  },
}).single("file");

router.get("/export", controller.downloadAddInventoryExport);
router.post("/bulk-upload", (req, res, next) => {
  inventoryExcelUpload(req, res, (error) => {
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
}, controller.bulkUploadAddInventories);

router.get("/getAll", controller.getAddInventories);
router.get("/getById/:externalId", controller.getAddInventoryById);
router.post("/", controller.createAddInventory);
router.put("/update/:externalId", controller.updateAddInventory);
router.delete("/delete/:externalId", controller.deleteAddInventory);

export default router;
