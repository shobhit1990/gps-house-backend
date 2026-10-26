import { Router } from "express";
import { container } from "tsyringe";
import { PaymentDetailsController } from "../../controllers/v1/PaymentDetailsController";

const router = Router();
const controller = container.resolve(PaymentDetailsController);

router.get("/getAll", controller.getPaymentDetails);
router.get("/getById/:externalId", controller.getPaymentDetailsById);
router.post("/", controller.createPaymentDetails);
router.put("/update/:externalId", controller.updatePaymentDetails);
router.delete("/delete/:externalId", controller.deletePaymentDetails);

export default router;
