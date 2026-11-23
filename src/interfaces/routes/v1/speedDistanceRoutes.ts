import { Router } from "express";
import { container } from "tsyringe";
import { SpeedDistanceController } from "../../controllers/v1/SpeedDistanceController";

const router = Router();
const controller = container.resolve(SpeedDistanceController);

router.get("/", controller.getSpeedDistanceReport);

export default router;
