
import { Router } from "express";
import { container } from "tsyringe";
import { TransporterController } from "../../controllers/v1/TransporterController";

const router = Router();

const transporterController = container.resolve(
  TransporterController,
);

router.get(
  "/getAll",
  transporterController.getTransporter,
);

router.get(
  "/getById/:externalId",
  transporterController.getTransporterById,
);

router.post(
  "/",
  transporterController.createTransporter,
);

router.put(
  "/update/:externalId",
  transporterController.updateTransporter,
);

router.delete(
  "/delete/:externalId",
  transporterController.deleteTransporter,
);

export default router;
