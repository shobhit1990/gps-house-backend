import { Router } from "express";
import { container } from "tsyringe";
import { AlertController } from "../../controllers/v1/AlertController";

const router = Router();
const controller = container.resolve(AlertController);

router.get("/getAll", controller.getAlerts);
router.get("/getById/:externalId", controller.getAlertById);
router.post("/", controller.createAlert);
router.put("/update/:externalId", controller.updateAlert);
router.delete("/delete/:externalId", controller.deleteAlert);

export default router;
