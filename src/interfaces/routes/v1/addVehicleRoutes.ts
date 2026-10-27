import { Router } from "express";
import { container } from "tsyringe";
import { AddVehicleController } from "../../controllers/v1/AddVehicleController";

const router = Router();
const controller = container.resolve(AddVehicleController);

router.get("/getAll", controller.getAddVehicle);

router.get("/getById/:externalId", controller.getAddVehicleById);

router.post("/", controller.createAddVehicle);

router.put("/update/:externalId", controller.updateAddVehicle);

router.delete("/delete/:externalId", controller.deleteAddVehicle);

export default router;