import { Router } from "express";
import { container } from "tsyringe";
import { VehicleLiveTrackingController } from "../../controllers/v1/VehicleLiveTrackingController";

const router = Router();
const controller = container.resolve(VehicleLiveTrackingController);

router.get("/", controller.getLiveTracking);

export default router;
