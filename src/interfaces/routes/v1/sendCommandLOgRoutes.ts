import { Router } from "express";
import { container } from "tsyringe";
import { SendCommandLogReportController } from "../../controllers/v1/SendCommandLogController";

const router = Router();
const controller = container.resolve(SendCommandLogReportController);

router.get("/", controller.getSendCommandLogReport);

export default router;
