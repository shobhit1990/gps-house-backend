import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import { CreateExpenseDto, UpdateExpenseDto } from "../domain/dto/ExpenseDto";
import { Client } from "../domain/entities/mysql/Client";
import { Expense } from "../domain/entities/mysql/Expense";
import { ExpenseType } from "../domain/entities/mysql/ExpenseType";
import { Transporter } from "../domain/entities/mysql/Transporter";
import { Status } from "../domain/enums/status";
import { IExpenseRepository } from "../domain/repositories/mysql/IExpenseRepository";
import { AppError } from "../utils/errors";
import { ExpenseResponse, IExpenseService } from "./interfaces/IExpenseService";

@injectable()
export class ExpenseService implements IExpenseService {
  constructor(
    @inject("IExpenseRepository")
    private readonly expenseRepository: IExpenseRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getExpenses(
    limit?: number,
    offset?: number,
  ): Promise<ExpenseResponse[]> {
    const expenses = await this.expenseRepository.getExpenses(limit, offset);
    return expenses.map((expense) => this.toResponse(expense));
  }

  async getExpenseById(externalId: string): Promise<ExpenseResponse> {
    const expense = await this.expenseRepository.getExpenseById(externalId);
    if (!expense) {
      throw new AppError("Expense not found", 404);
    }
    return this.toResponse(expense);
  }

  async createExpense(
    payload: CreateExpenseDto,
    actorUserId?: number,
  ): Promise<ExpenseResponse> {
    const [client, transporter, expenseType, actor] = await Promise.all([
      this.findClient(payload.client),
      this.findTransporter(payload.transporter),
      this.findExpenseType(payload.expenseType),
      this.findActor(actorUserId),
    ]);

    const expense = new Expense();
    expense.client = client;
    expense.transporter = transporter;
    expense.expenseType = expenseType;
    expense.createdBy = actor;
    this.assignFields(expense, payload);
    return this.toResponse(await this.expenseRepository.createExpense(expense));
  }

  async updateExpense(
    externalId: string,
    payload: UpdateExpenseDto,
    actorUserId?: number,
  ): Promise<ExpenseResponse> {
    const expense = await this.expenseRepository.getExpenseById(externalId);
    if (!expense) {
      throw new AppError("Expense not found", 404);
    }

    const actor = await this.findActor(actorUserId);
    if (actor) expense.updatedBy = actor;
    if (payload.client !== undefined) {
      expense.client = await this.findClient(payload.client);
    }
    if (payload.transporter !== undefined) {
      expense.transporter = await this.findTransporter(payload.transporter);
    }
    if (payload.expenseType !== undefined) {
      expense.expenseType = await this.findExpenseType(payload.expenseType);
    }
    this.assignFields(expense, payload);
    return this.toResponse(await this.expenseRepository.updateExpense(expense));
  }

  async deleteExpense(externalId: string, actorUserId?: number): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.expenseRepository.deleteExpense(externalId, actor);
  }

  private async findClient(externalId: string): Promise<Client> {
    const client = await this.em.fork().findOne(Client, {
      externalId,
      isDeleted: false,
    });
    if (!client) {
      throw new AppError("Client not found", 404);
    }
    return client;
  }

  private async findTransporter(externalId: string): Promise<Transporter> {
    const transporter = await this.em.fork().findOne(Transporter, {
      externalId,
      isDeleted: false,
    });
    if (!transporter) {
      throw new AppError("Transporter not found", 404);
    }
    return transporter;
  }

  private async findExpenseType(externalId: string): Promise<ExpenseType> {
    const expenseType = await this.em.fork().findOne(ExpenseType, {
      externalId,
      isDeleted: false,
    });
    if (!expenseType) {
      throw new AppError("Expense type not found", 404);
    }
    return expenseType;
  }

  private async findActor(userId?: number): Promise<Client | undefined> {
    if (userId === undefined) return undefined;
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new AppError("Invalid user ID", 401);
    }

    const actor = await this.em.fork().findOne(Client, {
      id: userId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!actor) {
      throw new AppError("User not found", 401);
    }
    return actor;
  }

  private assignFields(
    expense: Expense,
    payload: CreateExpenseDto | UpdateExpenseDto,
  ): void {
    if (payload.expenseName !== undefined) {
      expense.expenseName = payload.expenseName ?? undefined;
    }
    if (payload.amount !== undefined) expense.amount = payload.amount;
    if (payload.expenseDate !== undefined) {
      expense.expenseDate = payload.expenseDate;
    }
    if (payload.odometer !== undefined) {
      expense.odometer = payload.odometer ?? undefined;
    }
    if (payload.engineHours !== undefined) {
      expense.engineHours = payload.engineHours ?? undefined;
    }
    if (payload.description !== undefined) {
      expense.description = payload.description ?? undefined;
    }
    if (payload.quantity !== undefined) {
      expense.quantity = payload.quantity ?? undefined;
    }
    if (payload.supplier !== undefined) {
      expense.supplier = payload.supplier ?? undefined;
    }
    if (payload.buyer !== undefined) {
      expense.buyer = payload.buyer ?? undefined;
    }
    if (payload.status !== undefined) expense.status = payload.status;
    if (payload.reason !== undefined) {
      expense.reason = payload.reason ?? undefined;
    }
  }

  private toResponse(expense: Expense): ExpenseResponse {
    return {
      id: expense.externalId,
      client: {
        id: expense.client.externalId,
        name: expense.client.name ?? null,
        companyName: expense.client.companyName,
      },
      transporter: {
        id: expense.transporter.externalId,
        name: expense.transporter.name ?? null,
        companyName: expense.transporter.companyName,
      },
      expenseName: expense.expenseName ?? null,
      expenseType: {
        id: expense.expenseType.externalId,
        expenseName: expense.expenseType.expenseName,
      },
      amount: Number(expense.amount),
      expenseDate: expense.expenseDate,
      odometer: expense.odometer ?? null,
      engineHours: expense.engineHours ?? null,
      description: expense.description ?? null,
      quantity: expense.quantity ?? null,
      supplier: expense.supplier ?? null,
      buyer: expense.buyer ?? null,
      status: expense.status ?? null,
      reason: expense.reason ?? null,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }
}
