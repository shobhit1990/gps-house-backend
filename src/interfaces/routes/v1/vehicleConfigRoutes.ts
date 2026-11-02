import { Router } from "express";
import { container } from "tsyringe";
import { VehicleConfigController } from "../../controllers/v1/VehicleConfigController";

const router = Router();
const controller = container.resolve(VehicleConfigController);

router.get("/getAll", controller.getVehicleConfigs);
router.get("/getById/:externalId", controller.getVehicleConfigById);
router.post("/", controller.createVehicleConfig);
router.put("/update/:externalId", controller.updateVehicleConfig);
router.delete("/delete/:externalId", controller.deleteVehicleConfig);

export default router;
