import { Router } from "express";
import { container } from "tsyringe";
import { TechnicianController } from "../../controllers/v1/TechnicianController";

const router = Router();
const controller = container.resolve(TechnicianController);

router.get("/getAll", controller.getTechnicians);
router.get("/getById/:externalId", controller.getTechnicianById);
router.post("/", controller.createTechnician);
router.put("/update/:externalId", controller.updateTechnician);
router.delete("/delete/:externalId", controller.deleteTechnician);

export default router;
