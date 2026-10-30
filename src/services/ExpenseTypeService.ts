import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateExpenseTypeDto,
  UpdateExpenseTypeDto,
} from "../domain/dto/ExpenseTypeDto";
import { ExpenseType } from "../domain/entities/mysql/ExpenseType";
import { Client } from "../domain/entities/mysql/Client";
import { Status } from "../domain/enums/status";
import { IExpenseTypeRepository } from "../domain/repositories/mysql/IExpenseTypeRepository";
import { AppError } from "../utils/errors";
import {
  ExpenseTypeResponse,
  IExpenseTypeService,
} from "./interfaces/IExpenseTypeService";

@injectable()
export class ExpenseTypeService implements IExpenseTypeService {
  constructor(
    @inject("IExpenseTypeRepository")
    private readonly expenseTypeRepository: IExpenseTypeRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getExpenseTypes(): Promise<ExpenseTypeResponse[]> {
    const expenseTypes = await this.expenseTypeRepository.getExpenseTypes();
    return expenseTypes.map((expenseType) => this.toResponse(expenseType));
  }

  async getExpenseTypeById(externalId: string): Promise<ExpenseTypeResponse> {
    const expenseType =
      await this.expenseTypeRepository.getExpenseTypeById(externalId);
    if (!expenseType) {
      throw new AppError("Expense type not found", 404);
    }
    return this.toResponse(expenseType);
  }

  async createExpenseType(
    payload: CreateExpenseTypeDto,
    actorUserId?: number,
  ): Promise<ExpenseTypeResponse> {
    const expenseType = new ExpenseType();
    expenseType.expenseName = payload.expenseName;
    expenseType.status = payload.status;
    expenseType.reason = payload.reason ?? undefined;
    expenseType.createdBy = await this.findActor(actorUserId);
    return this.toResponse(
      await this.expenseTypeRepository.createExpenseType(expenseType),
    );
  }

  async updateExpenseType(
    externalId: string,
    payload: UpdateExpenseTypeDto,
    actorUserId?: number,
  ): Promise<ExpenseTypeResponse> {
    const expenseType =
      await this.expenseTypeRepository.getExpenseTypeById(externalId);
    if (!expenseType) {
      throw new AppError("Expense type not found", 404);
    }

    const actor = await this.findActor(actorUserId);
    if (actor) expenseType.updatedBy = actor;
    if (payload.expenseName !== undefined) {
      expenseType.expenseName = payload.expenseName;
    }
    if (payload.status !== undefined) expenseType.status = payload.status;
    if (payload.reason !== undefined) {
      expenseType.reason = payload.reason ?? undefined;
    }

    return this.toResponse(
      await this.expenseTypeRepository.updateExpenseType(expenseType),
    );
  }

  async deleteExpenseType(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.expenseTypeRepository.deleteExpenseType(externalId, actor);
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

  private toResponse(expenseType: ExpenseType): ExpenseTypeResponse {
    return {
      id: expenseType.externalId,
      expenseName: expenseType.expenseName,
      status: expenseType.status ?? null,
      reason: expenseType.reason ?? null,
      createdAt: expenseType.createdAt,
      updatedAt: expenseType.updatedAt,
      deletedAt: expenseType.deletedAt ?? null,
    };
  }
}
