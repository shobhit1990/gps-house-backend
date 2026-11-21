import { Router } from "express";
import { container } from "tsyringe";
import { IdleSummaryController } from "../../controllers/v1/IdleSummaryController";

const router = Router();
const controller = container.resolve(IdleSummaryController);

router.get("/", controller.getIdleSummary);

export default router;
