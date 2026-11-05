import { Router } from "express";
import { container } from "tsyringe";
import { DriverDetailController } from "../../controllers/v1/DriverDetailController";

const router = Router();
const controller = container.resolve(DriverDetailController);

router.get("/getAll", controller.getDriverDetails);
router.get("/getById/:externalId", controller.getDriverDetailById);
router.post("/", controller.createDriverDetail);
router.put("/update/:externalId", controller.updateDriverDetail);
router.delete("/delete/:externalId", controller.deleteDriverDetail);

export default router;
