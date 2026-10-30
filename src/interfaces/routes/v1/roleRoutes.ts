import { Router } from "express";
import { container } from "tsyringe";
import { RoleController } from "../../controllers/v1/RoleController";

const router = Router();
const controller = container.resolve(RoleController);

router.get("/get-all", controller.getRole);
router.get("/get-by-id/:externalId", controller.getRoleById);
router.get("/get-by-code/:roleCode", controller.getRoleByCode);
router.post("/create", controller.createRole);
router.put("/update/:externalId", controller.updateRole);
router.patch("/status/:externalId", controller.updateRoleStatus);
router.delete("/delete/:externalId", controller.deleteRole);

export default router;
