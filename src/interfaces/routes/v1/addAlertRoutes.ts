import { Router } from "express";
import { container } from "tsyringe";
import { AddAlertController } from "../../controllers/v1/AddAlertController";

const router = Router();
const controller = container.resolve(AddAlertController);

router.get("/getAll", controller.getAddAlerts);
router.get("/getById/:externalId", controller.getAddAlertById);
router.post("/", controller.createAddAlert);
router.put("/update/:externalId", controller.updateAddAlert);
router.delete("/delete/:externalId", controller.deleteAddAlert);

export default router;
