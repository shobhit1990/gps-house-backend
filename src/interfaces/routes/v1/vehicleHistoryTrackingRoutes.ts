import { Router } from "express";
import { container } from "tsyringe";
import { VehicleHistoryTrackingController } from "../../controllers/v1/VehicleHistoryTrackingController";

const router = Router();
const controller = container.resolve(VehicleHistoryTrackingController);

router.get("/vehicles", controller.getVehicleList);
router.get("/history", controller.getHistory);
router.get("/address", controller.getAddress);

export default router;
