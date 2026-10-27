import { Router } from "express";
import { container } from "tsyringe";
import { UserController } from "../../controllers/v1/UserController";

const router = Router();
const controller = container.resolve(UserController);

router.get("/getAll", controller.getUsers);
router.get("/getById/:externalId", controller.getUserById);
router.post("/", controller.addUser);
router.put("/update/:externalId", controller.updateUser);
router.delete("/delete/:externalId", controller.deleteUser);

export default router;
