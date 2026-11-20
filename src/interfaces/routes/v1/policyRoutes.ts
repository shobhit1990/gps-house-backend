import { Router } from "express";
import { container } from "tsyringe";
import { PolicyController } from "../../controllers/v1/PolicyController";

const router = Router();
const controller = container.resolve(PolicyController);

router.get("/getAll", controller.getPolicies);
router.get("/getById/:externalId", controller.getPolicyById);
router.post("/create", controller.createPolicy);
router.put("/update/:externalId", controller.updatePolicy);
router.delete("/delete/:externalId", controller.deletePolicy);

export default router;
