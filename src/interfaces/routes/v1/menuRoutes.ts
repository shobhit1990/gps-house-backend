import { Router } from "express";
import { container } from "tsyringe";
import { MenuItemController } from "../../controllers/v1/MenuItemController";

const router = Router();
const menuItemController = container.resolve(MenuItemController);

router.get("/sidebar", menuItemController.getUserMenus);
router.get("/get-all/paginated", menuItemController.getMenuItemsPaginated);
router.get("/get-all", menuItemController.getMenuItems);
router.get("/get-by-id/:externalId", menuItemController.getMenuItemById);
router.put("/update/:externalId", menuItemController.updateMenuItem);

export default router;
