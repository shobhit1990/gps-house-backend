import {
  CreateExpenseDto,
  UpdateExpenseDto,
} from "../../domain/dto/ExpenseDto";
import { Status } from "../../domain/enums/status";

export interface ExpenseResponse {
  id: string;
  client: { id: string; name: string | null; companyName: string };
  transporter: { id: string; name: string | null; companyName: string };
  expenseName: string | null;
  expenseType: { id: string; expenseName: string };
  amount: number;
  expenseDate: Date;
  odometer: number | null;
  engineHours: number | null;
  description: string | null;
  quantity: number | null;
  supplier: string | null;
  buyer: string | null;
  status: Status | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExpenseService {
  getExpenses(limit?: number, offset?: number): Promise<ExpenseResponse[]>;

  getExpenseById(externalId: string): Promise<ExpenseResponse>;

  createExpense(
    payload: CreateExpenseDto,
    actorUserId?: number,
  ): Promise<ExpenseResponse>;

  updateExpense(
    externalId: string,
    payload: UpdateExpenseDto,
    actorUserId?: number,
  ): Promise<ExpenseResponse>;

  deleteExpense(externalId: string, actorUserId?: number): Promise<void>;
}
