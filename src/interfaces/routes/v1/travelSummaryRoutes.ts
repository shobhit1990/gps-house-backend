import { Router } from "express";
import { container } from "tsyringe";
import { TravelSummaryController } from "../../controllers/v1/TravelSummaryController";

const router = Router();
const controller = container.resolve(TravelSummaryController);

router.get("/", controller.getTravelSummary);

export default router;
