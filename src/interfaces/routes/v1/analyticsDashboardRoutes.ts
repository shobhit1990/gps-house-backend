import { Router } from "express";
import { container } from "tsyringe";
import { AnalyticsDashboardController } from "../../controllers/v1/AnalyticsDashboard";

const router = Router();
const controller = container.resolve(AnalyticsDashboardController);

router.get("/", controller.getAnalyticsDashboard);

export default router;
