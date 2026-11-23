import { Router } from "express";
import { container } from "tsyringe";
import { PoiReportController } from "../../controllers/v1/PoiReportController";

const router = Router();
const controller = container.resolve(PoiReportController);

router.get("/", controller.getPoiReport);

export default router;
