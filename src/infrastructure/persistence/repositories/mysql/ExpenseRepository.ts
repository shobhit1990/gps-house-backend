import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { Expense } from "../../../../domain/entities/mysql/Expense";
import { AddVehicle } from "../../../../domain/entities/mysql/AddVehicle";
import { Client } from "../../../../domain/entities/mysql/Client";
import { DriverDetail } from "../../../../domain/entities/mysql/DriverDetail";
import { ExpenseType } from "../../../../domain/entities/mysql/ExpenseType";
import { Transporter } from "../../../../domain/entities/mysql/Transporter";
import { IExpenseRepository } from "../../../../domain/repositories/mysql/IExpenseRepository";
import { AppError } from "../../../../utils/errors";

const populate = [
  "client",
  "client.owner_name",
  "client.language",
  "client.timezone",
  "transporter",
  "transporter.client",
  "transporter.language",
  "transporter.timezone",
  "vehicle",
  "vehicle.device",
  "driver",
  "driver.client",
  "driver.transporter",
  "driver.licenseToDrive",
  "driver.geofences",
  "expenseType",
  "createdBy",
  "updatedBy",
  "deletedBy",
] as const;

@injectable()
export class ExpenseRepository implements IExpenseRepository {
  constructor(private readonly em: EntityManager) {}

  async getExpenses(limit?: number, offset?: number): Promise<Expense[]> {
    return this.em.fork().find(
      Expense,
      { isDeleted: false },
      {
        orderBy: { id: "ASC" },
        populate: [...populate],
        ...(limit !== undefined ? { limit } : {}),
        ...(offset !== undefined ? { offset } : {}),
      },
    );
  }

  async getExpenseById(externalId: string): Promise<Expense | null> {
    return this.em
      .fork()
      .findOne(
        Expense,
        { externalId, isDeleted: false },
        { populate: [...populate] },
      );
  }

  async createExpense(expense: Expense): Promise<Expense> {
    const em = this.em.fork();
    this.setReferences(em, expense);
    await em.persistAndFlush(expense);
    await em.populate(expense, [...populate]);
    return expense;
  }

  async updateExpense(expense: Expense): Promise<Expense> {
    const em = this.em.fork();
    const existing = await em.findOne(Expense, {
      externalId: expense.externalId,
      isDeleted: false,
    });
    if (!existing) {
      throw new AppError("Expense not found", 404);
    }

    em.assign(existing, {
      client: em.getReference(Client, expense.client.id),
      transporter: em.getReference(Transporter, expense.transporter.id),
      expenseFor: expense.expenseFor,
      vehicle: expense.vehicle
        ? em.getReference(AddVehicle, expense.vehicle.id)
        : null,
      driver: expense.driver
        ? em.getReference(DriverDetail, expense.driver.id)
        : null,
      expenseName: expense.expenseName,
      expenseType: em.getReference(ExpenseType, expense.expenseType.id),
      amount: expense.amount,
      expenseDate: expense.expenseDate,
      odometer: expense.odometer,
      engineHours: expense.engineHours,
      description: expense.description,
      quantity: expense.quantity,
      supplier: expense.supplier,
      buyer: expense.buyer,
      status: expense.status,
      reason: expense.reason,
      ...(expense.updatedBy
        ? { updatedBy: em.getReference(Client, expense.updatedBy.id) }
        : {}),
      updatedAt: new Date(),
    });
    await em.flush();
    await em.populate(existing, [...populate]);
    return existing;
  }

  async deleteExpense(externalId: string, deletedBy?: Client): Promise<void> {
    const em = this.em.fork();
    const expense = await em.findOne(Expense, {
      externalId,
      isDeleted: false,
    });
    if (!expense) {
      throw new AppError("Expense not found", 404);
    }

    const now = new Date();
    expense.isDeleted = true;
    expense.deletedAt = now;
    expense.updatedAt = now;
    if (deletedBy) {
      expense.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }

  private setReferences(em: EntityManager, expense: Expense): void {
    expense.client = em.getReference(Client, expense.client.id);
    expense.transporter = em.getReference(Transporter, expense.transporter.id);
    expense.expenseType = em.getReference(ExpenseType, expense.expenseType.id);
    expense.vehicle = expense.vehicle
      ? em.getReference(AddVehicle, expense.vehicle.id)
      : null;
    expense.driver = expense.driver
      ? em.getReference(DriverDetail, expense.driver.id)
      : null;
    if (expense.createdBy) {
      expense.createdBy = em.getReference(Client, expense.createdBy.id);
    }
  }
}
