import { Router } from "express";
import { container } from "tsyringe";
import { SimTrackingController } from "../../controllers/v1/SimTrackingController";

const router = Router();
const controller = container.resolve(SimTrackingController);

router.get("/", controller.getSimTrackingReport);

export default router;
