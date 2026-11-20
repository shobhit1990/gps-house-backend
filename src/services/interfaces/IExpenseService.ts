import {
  CreateExpenseDto,
  UpdateExpenseDto,
} from "../../domain/dto/ExpenseDto";
import { ExpenseFor } from "../../domain/enums/ExpenseFor";
import { Status } from "../../domain/enums/status";

export interface ExpenseParty {
  id: string;
  name: string | null;
  companyName: string;
  userName?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  status?: Status | string | null;
  reason?: string | null;
}

export interface ExpenseResponse {
  id: string;
  client: Record<string, unknown>;
  transporter: Record<string, unknown>;
  expenseFor: ExpenseFor;
  vehicle: Record<string, unknown> | null;
  driver: Record<string, unknown> | null;
  expenseName: string | null;
  expenseType: Record<string, unknown>;
  amount: number;
  expenseDate: Date;
  odometer: number | null;
  engineHours: number | null;
  description: string | null;
  quantity: number | null;
  supplier: string | null;
  buyer: string | null;
  createdBy: ExpenseParty | null;
  updatedBy: ExpenseParty | null;
  status: Status | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
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
