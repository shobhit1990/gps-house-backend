import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateExpenseDto,
  UpdateExpenseDto,
} from "../../../domain/dto/ExpenseDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { IExpenseService } from "../../../services/interfaces/IExpenseService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class ExpenseController {
  constructor(
    @inject("IExpenseService")
    private readonly expenseService: IExpenseService,
  ) {}

  getExpenses = asyncHandler(async (_req: Request, res: Response) => {
    const expenses = await this.expenseService.getExpenses();
    res.status(200).json({
      message: "Expense list fetched successfully",
      data: expenses,
    });
  });

  getExpenseById = asyncHandler(async (req: Request, res: Response) => {
    const expense = await this.expenseService.getExpenseById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Expense fetched successfully",
      data: expense,
    });
  });

  createExpense = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(CreateExpenseDto, req.body);
    await this.validateDto(dto);
    const expense = await this.expenseService.createExpense(dto, req.userId);
    res.status(201).json({
      message: "Expense created successfully",
      data: expense,
    });
  });

  updateExpense = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(UpdateExpenseDto, req.body);
    await this.validateDto(dto);
    const expense = await this.expenseService.updateExpense(
      this.getExternalId(req),
      dto,
      req.userId,
    );
    res.status(200).json({
      message: "Expense updated successfully",
      data: expense,
    });
  });

  deleteExpense = asyncHandler(async (req: CustomRequest, res: Response) => {
    await this.expenseService.deleteExpense(
      this.getExternalId(req),
      req.userId,
    );
    res.status(200).json({
      message: "Expense deleted successfully",
    });
  });

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid expense ID", 400);
    }
    return externalId;
  }

  private async validateDto(dto: object): Promise<void> {
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length) {
      throw new AppError(
        "Validation failed. Please check the errors and try again.",
        400,
        null,
        formatValidationErrors(errors),
      );
    }
  }
}
