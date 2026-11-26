import { Router } from "express";
import { container } from "tsyringe";
import { CustomAlertController } from "../../controllers/v1/CustomAlertController";

const router = Router();
const controller = container.resolve(CustomAlertController);

router.get("/getAll", controller.getCustomAlerts);
router.get("/getById/:externalId", controller.getCustomAlertById);
router.post("/", controller.createCustomAlert);
router.put("/update/:externalId", controller.updateCustomAlert);
router.delete("/delete/:externalId", controller.deleteCustomAlert);

export default router;
