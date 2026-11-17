import { Router } from "express";
import { container } from "tsyringe";
import { LicenseController } from "../../controllers/v1/LicenseController";

const router = Router();
const controller = container.resolve(LicenseController);

router.get("/getAll", controller.getLicenses);
router.get("/getById/:externalId", controller.getLicenseById);
router.post("/create", controller.createLicense);
router.put("/update/:externalId", controller.updateLicense);
router.delete("/delete/:externalId", controller.deleteLicense);

export default router;
