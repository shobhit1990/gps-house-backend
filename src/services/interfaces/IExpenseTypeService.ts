import {
  CreateExpenseTypeDto,
  UpdateExpenseTypeDto,
} from "../../domain/dto/ExpenseTypeDto";
import { Status } from "../../domain/enums/status";

export interface ExpenseTypeResponse {
  id: string;
  expenseName: string;
  status: Status | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface IExpenseTypeService {
  getExpenseTypes(): Promise<ExpenseTypeResponse[]>;

  getExpenseTypeById(externalId: string): Promise<ExpenseTypeResponse>;

  createExpenseType(
    payload: CreateExpenseTypeDto,
    actorUserId?: number,
  ): Promise<ExpenseTypeResponse>;

  updateExpenseType(
    externalId: string,
    payload: UpdateExpenseTypeDto,
    actorUserId?: number,
  ): Promise<ExpenseTypeResponse>;

  deleteExpenseType(externalId: string, actorUserId?: number): Promise<void>;
}
