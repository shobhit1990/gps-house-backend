import { Router } from "express";
import { HealthController } from "../../controllers/v1/HealthController";

const router = Router();
const healthController = new HealthController();

router.get("/", (req, res, next) => healthController.check(req, res, next));

export default router;
