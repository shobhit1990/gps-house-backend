import { Router } from "express";
import { container } from "tsyringe";
import { ParkedScheduleController } from "../../controllers/v1/ParkedScheduleController";

const router = Router();
const controller = container.resolve(ParkedScheduleController);

router.get("/getAll", controller.getParkedSchedules);
router.get("/getById/:externalId", controller.getParkedScheduleById);
router.post("/", controller.createParkedSchedule);
router.put("/update/:externalId", controller.updateParkedSchedule);
router.delete("/delete/:externalId", controller.deleteParkedSchedule);

export default router;
