import { ExpenseType } from "../../entities/mysql/ExpenseType";
import { Client } from "../../entities/mysql/Client";

export interface IExpenseTypeRepository {
  getExpenseTypes(): Promise<ExpenseType[]>;

  getExpenseTypeById(externalId: string): Promise<ExpenseType | null>;

  createExpenseType(expenseType: ExpenseType): Promise<ExpenseType>;

  updateExpenseType(expenseType: ExpenseType): Promise<ExpenseType>;

  deleteExpenseType(externalId: string, deletedBy?: Client): Promise<void>;
}
