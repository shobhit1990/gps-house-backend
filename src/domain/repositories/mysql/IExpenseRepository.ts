import { Expense } from "../../entities/mysql/Expense";
import { Client } from "../../entities/mysql/Client";

export interface IExpenseRepository {
  getExpenses(): Promise<Expense[]>;

  getExpenseById(externalId: string): Promise<Expense | null>;

  createExpense(expense: Expense): Promise<Expense>;

  updateExpense(expense: Expense): Promise<Expense>;

  deleteExpense(externalId: string, deletedBy?: Client): Promise<void>;
}
