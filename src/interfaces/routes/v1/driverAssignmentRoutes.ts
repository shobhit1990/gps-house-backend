import { Router } from "express";
import { container } from "tsyringe";
import { DriverAssignmentController } from "../../controllers/v1/DriverAssignmentController";

const router = Router();
const controller = container.resolve(DriverAssignmentController);

router.get("/", controller.getDriverAssignment);

export default router;
