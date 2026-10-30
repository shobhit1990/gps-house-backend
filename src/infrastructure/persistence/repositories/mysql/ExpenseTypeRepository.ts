import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { ExpenseType } from "../../../../domain/entities/mysql/ExpenseType";
import { Client } from "../../../../domain/entities/mysql/Client";
import { IExpenseTypeRepository } from "../../../../domain/repositories/mysql/IExpenseTypeRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class ExpenseTypeRepository implements IExpenseTypeRepository {
  constructor(private readonly em: EntityManager) {}

  async getExpenseTypes(): Promise<ExpenseType[]> {
    return this.em
      .fork()
      .find(
        ExpenseType,
        { isDeleted: false }
      );
  }

  async getExpenseTypeById(externalId: string): Promise<ExpenseType | null> {
    return this.em
      .fork()
      .findOne(ExpenseType, { externalId, isDeleted: false });
  }

  async createExpenseType(expenseType: ExpenseType): Promise<ExpenseType> {
    const em = this.em.fork();
    if (expenseType.createdBy) {
      expenseType.createdBy = em.getReference(Client, expenseType.createdBy.id);
    }
    await em.persistAndFlush(expenseType);
    return expenseType;
  }

  async updateExpenseType(expenseType: ExpenseType): Promise<ExpenseType> {
    const em = this.em.fork();
    const existing = await em.findOne(ExpenseType, {
      externalId: expenseType.externalId,
      isDeleted: false,
    });
    if (!existing) {
      throw new AppError("Expense type not found", 404);
    }

    em.assign(existing, {
      expenseName: expenseType.expenseName,
      status: expenseType.status,
      reason: expenseType.reason,
      ...(expenseType.updatedBy
        ? { updatedBy: em.getReference(Client, expenseType.updatedBy.id) }
        : {}),
      updatedAt: new Date(),
    });
    await em.flush();
    return existing;
  }

  async deleteExpenseType(
    externalId: string,
    deletedBy?: Client,
  ): Promise<void> {
    const em = this.em.fork();
    const expenseType = await em.findOne(ExpenseType, {
      externalId,
      isDeleted: false,
    });
    if (!expenseType) {
      throw new AppError("Expense type not found", 404);
    }

    const now = new Date();
    expenseType.isDeleted = true;
    expenseType.deletedAt = now;
    expenseType.updatedAt = now;
    if (deletedBy) {
      expenseType.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }
}
