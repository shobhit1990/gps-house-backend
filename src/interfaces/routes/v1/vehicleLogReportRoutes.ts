import { Router } from "express";
import { container } from "tsyringe";
import { AddVehicleController } from "../../controllers/v1/AddVehicleController";

const router = Router();
const controller = container.resolve(AddVehicleController);

router.get("/", controller.getVehicleLogReport);

export default router;
