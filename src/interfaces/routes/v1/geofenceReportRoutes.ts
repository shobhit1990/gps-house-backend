import { Router } from "express";
import { container } from "tsyringe";
import { GeofenceReportController } from "../../controllers/v1/GeofenceReportController";

const router = Router();
const controller = container.resolve(GeofenceReportController);

router.get("/", controller.getGeofenceReport);

export default router;
