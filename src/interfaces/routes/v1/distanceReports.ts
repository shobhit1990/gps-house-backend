import { Router } from "express";
import { container } from "tsyringe";
import { DistanceReportController } from "../../controllers/v1/DistanceReportController";

const router = Router();
const controller = container.resolve(DistanceReportController);

router.get("/", controller.getDistanceReport);

export default router;
