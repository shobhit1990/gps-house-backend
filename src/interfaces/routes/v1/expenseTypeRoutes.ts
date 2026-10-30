import { Router } from "express";
import { container } from "tsyringe";
import { ExpenseTypeController } from "../../controllers/v1/ExpenseTypeController";

const router = Router();
const controller = container.resolve(ExpenseTypeController);

router.get("/getAll", controller.getExpenseTypes);
router.get("/getById/:externalId", controller.getExpenseTypeById);
router.post("/", controller.createExpenseType);
router.put("/update/:externalId", controller.updateExpenseType);
router.delete("/delete/:externalId", controller.deleteExpenseType);

export default router;
