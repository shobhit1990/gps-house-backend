import { Router } from "express";
import { container } from "tsyringe";
import { RideReportController } from "../../controllers/v1/RideReportController";

const router = Router();
const controller = container.resolve(RideReportController);

router.get("/", controller.getRideReport);

export default router;
