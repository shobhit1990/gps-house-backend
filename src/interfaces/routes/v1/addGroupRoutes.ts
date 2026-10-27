import { Router } from "express";
import { container } from "tsyringe";
import { AddGroupController } from "../../controllers/v1/AddGroupController";

const router = Router();
const controller = container.resolve(AddGroupController);

router.get("/getAll", controller.getAddGroups);
router.get("/getById/:externalId", controller.getAddGroupById);
router.post("/", controller.createAddGroup);
router.put("/update/:externalId", controller.updateAddGroup);
router.delete("/delete/:externalId", controller.deleteAddGroup);

export default router;
