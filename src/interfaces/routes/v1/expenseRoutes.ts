import { Router } from "express";
import { container } from "tsyringe";
import { ExpenseController } from "../../controllers/v1/ExpenseController";

const router = Router();
const controller = container.resolve(ExpenseController);

router.get("/getAll", controller.getExpenses);
router.get("/getById/:externalId", controller.getExpenseById);
router.post("/", controller.createExpense);
router.put("/update/:externalId", controller.updateExpense);
router.delete("/delete/:externalId", controller.deleteExpense);

export default router;
