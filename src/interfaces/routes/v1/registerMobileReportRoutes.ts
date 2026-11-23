import { Router } from "express";
import { container } from "tsyringe";
import { RegisterMobileReportController } from "../../controllers/v1/RegisterMobileReportController";

const router = Router();
const controller = container.resolve(RegisterMobileReportController);

router.get("/", controller.getRegisterMobileReport);

export default router;
