import { Router } from "express";
import { container } from "tsyringe";
import { StatusReportController } from "../../controllers/v1/StatusReportController";

const router = Router();
const controller = container.resolve(StatusReportController);

router.get("/", controller.getStatusReport);

export default router;
