import { container } from "tsyringe";
import { IExpenseTypeRepository } from "../../../domain/repositories/mysql/IExpenseTypeRepository";
import { ExpenseTypeRepository } from "../../persistence/repositories/mysql/ExpenseTypeRepository";
import { IExpenseTypeService } from "../../../services/interfaces/IExpenseTypeService";
import { ExpenseTypeService } from "../../../services/ExpenseTypeService";

export function registerExpenseTypeDependencies() {
  container.register<IExpenseTypeRepository>(
    "IExpenseTypeRepository",
    ExpenseTypeRepository,
  );
  container.register<IExpenseTypeService>(
    "IExpenseTypeService",
    ExpenseTypeService,
  );
}
