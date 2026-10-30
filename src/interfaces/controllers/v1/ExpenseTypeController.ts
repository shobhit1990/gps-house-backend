import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateExpenseTypeDto,
  UpdateExpenseTypeDto,
} from "../../../domain/dto/ExpenseTypeDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { IExpenseTypeService } from "../../../services/interfaces/IExpenseTypeService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class ExpenseTypeController {
  constructor(
    @inject("IExpenseTypeService")
    private readonly expenseTypeService: IExpenseTypeService,
  ) {}

  getExpenseTypes = asyncHandler(async (_req: Request, res: Response) => {
    const expenseTypes = await this.expenseTypeService.getExpenseTypes();
    res.status(200).json({
      message: "Expense type list fetched successfully",
      data: expenseTypes,
    });
  });

  getExpenseTypeById = asyncHandler(async (req: Request, res: Response) => {
    const expenseType = await this.expenseTypeService.getExpenseTypeById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Expense type fetched successfully",
      data: expenseType,
    });
  });

  createExpenseType = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(CreateExpenseTypeDto, req.body);
      await this.validateDto(dto);
      const expenseType = await this.expenseTypeService.createExpenseType(
        dto,
        req.userId,
      );
      res.status(201).json({
        message: "Expense type created successfully",
        data: expenseType,
      });
    },
  );

  updateExpenseType = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(UpdateExpenseTypeDto, req.body);
      await this.validateDto(dto);
      const expenseType = await this.expenseTypeService.updateExpenseType(
        this.getExternalId(req),
        dto,
        req.userId,
      );
      res.status(200).json({
        message: "Expense type updated successfully",
        data: expenseType,
      });
    },
  );

  deleteExpenseType = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      await this.expenseTypeService.deleteExpenseType(
        this.getExternalId(req),
        req.userId,
      );
      res.status(200).json({
        message: "Expense type deleted successfully",
      });
    },
  );

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid expense type ID", 400);
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
