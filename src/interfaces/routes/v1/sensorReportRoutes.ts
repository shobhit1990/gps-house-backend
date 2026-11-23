import { Router } from "express";
import { container } from "tsyringe";
import { SensorReportController } from "../../controllers/v1/SensorReportController";

const router = Router();
const controller = container.resolve(SensorReportController);

router.get("/", controller.getSensorReport);

export default router;
