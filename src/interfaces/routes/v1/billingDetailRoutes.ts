import { Router } from "express";
import { container } from "tsyringe";
import { BillingDetailController } from "../../controllers/v1/BillingDetailController";

const router = Router();
const controller = container.resolve(BillingDetailController);

router.get("/getAll", controller.getBillingDetails);

router.get("/getById/:externalId", controller.getBillingDetailById);

router.post("/", controller.createBillingDetail);

router.put("/update/:externalId", controller.updateBillingDetail);

router.delete("/delete/:externalId", controller.deleteBillingDetail);

export default router;
