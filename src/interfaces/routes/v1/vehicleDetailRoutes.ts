import { Router } from "express";
import { container } from "tsyringe";
import { VehicleDetailController } from "../../controllers/v1/VehicleDetailController";

const router = Router();
const controller = container.resolve(VehicleDetailController);

router.get("/getAll", controller.getVehicleDetails);
router.get("/getById/:externalId", controller.getVehicleDetailById);
router.post("/", controller.createVehicleDetail);
router.put("/update/:externalId", controller.updateVehicleDetail);
router.delete("/delete/:externalId", controller.deleteVehicleDetail);

export default router;
