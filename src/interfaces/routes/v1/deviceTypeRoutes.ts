import { Router } from "express";
import { container } from "tsyringe";
import { DeviceTypeController } from "../../controllers/v1/DeviceTypeController";

const router = Router();
const controller = container.resolve(DeviceTypeController);

router.get("/getAll", controller.getDeviceTypes);
router.get("/getById/:externalId", controller.getDeviceTypeById);
router.post("/", controller.createDeviceType);
router.put("/update/:externalId", controller.updateDeviceType);
router.delete("/delete/:externalId", controller.deleteDeviceType);

export default router;
