import { Router } from "express";
import { container } from "tsyringe";
import { AuthController } from "../../controllers/v1/AuthController";

const router = Router();
const controller = container.resolve(AuthController);

router.post("/mobile/login", controller.loginAuth);

export default router;