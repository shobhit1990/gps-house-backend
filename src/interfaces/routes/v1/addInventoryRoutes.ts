import { Router } from "express";
import { container } from "tsyringe";
import { AddInventoryController } from "../../controllers/v1/AddInventoryController";

const router = Router();
const controller = container.resolve(AddInventoryController);

router.get("/getAll", controller.getAddInventories);
router.get("/getById/:externalId", controller.getAddInventoryById);
router.post("/", controller.createAddInventory);
router.put("/update/:externalId", controller.updateAddInventory);
router.delete("/delete/:externalId", controller.deleteAddInventory);

export default router;
