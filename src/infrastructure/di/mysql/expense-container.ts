import { container } from "tsyringe";
import { IExpenseRepository } from "../../../domain/repositories/mysql/IExpenseRepository";
import { ExpenseRepository } from "../../persistence/repositories/mysql/ExpenseRepository";
import { IExpenseService } from "../../../services/interfaces/IExpenseService";
import { ExpenseService } from "../../../services/ExpenseService";

export function registerExpenseDependencies() {
  container.register<IExpenseRepository>(
    "IExpenseRepository",
    ExpenseRepository,
  );
  container.register<IExpenseService>("IExpenseService", ExpenseService);
}
