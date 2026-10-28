import { Router } from "express";
import { container } from "tsyringe";
import { JobsheetController } from "../../controllers/v1/JobsheetController";

const router = Router();
const controller = container.resolve(JobsheetController);

router.get("/getAll", controller.getJobsheets);
router.get("/getById/:externalId", controller.getJobsheetById);
router.post("/", controller.createJobsheet);
router.put("/update/:externalId", controller.updateJobsheet);
router.delete("/delete/:externalId", controller.deleteJobsheet);

export default router;
