import { Router } from "express";
import { container } from "tsyringe";
import { GeofenceController } from "../../controllers/v1/GeofenceController";

const router = Router();
const controller = container.resolve(GeofenceController);

router.get("/getAll", controller.getGeofences);
router.get("/getById/:externalId", controller.getGeofenceById);
router.post("/", controller.createGeofence);
router.put("/update/:externalId", controller.updateGeofence);
router.delete("/delete/:externalId", controller.deleteGeofence);

export default router;
