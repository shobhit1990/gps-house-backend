import { Router } from "express";
import { container } from "tsyringe";
import { DeviceController } from "../../controllers/v1/DeviceController";

const router = Router();
const controller = container.resolve(DeviceController);

router.get("/getAll", controller.getDevices);
router.get("/getById/:externalId", controller.getDeviceById);
router.get("/inventory/available", controller.getAvailableInventories);
router.get("/inventory/imei/:imei", controller.getAvailableInventoryByImei);
router.post("/", controller.createDevice);
router.put("/update/:externalId", controller.updateDevice);
router.delete("/delete/:externalId", controller.deleteDevice);

export default router;
