import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateAddAlertDto,
  UpdateAddAlertDto,
} from "../../../domain/dto/AddAlertFormDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { IAddAlertService } from "../../../services/interfaces/IAddAlertService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class AddAlertController {
  constructor(
    @inject("IAddAlertService")
    private readonly addAlertService: IAddAlertService,
  ) {}

  getAddAlerts = asyncHandler(async (_req: Request, res: Response) => {
    const alerts = await this.addAlertService.getAddAlerts();
    res.status(200).json({
      message: "Add alert list fetched successfully",
      data: alerts,
    });
  });

  getAddAlertById = asyncHandler(async (req: Request, res: Response) => {
    const alert = await this.addAlertService.getAddAlertById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Add alert fetched successfully",
      data: alert,
    });
  });

  createAddAlert = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(CreateAddAlertDto, req.body);
    await this.validateDto(dto);
    const alert = await this.addAlertService.createAddAlert(dto, req.userId);
    res.status(201).json({
      message: "Add alert created successfully",
      data: alert,
    });
  });

  updateAddAlert = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(UpdateAddAlertDto, req.body);
    await this.validateDto(dto);
    const alert = await this.addAlertService.updateAddAlert(
      this.getExternalId(req),
      dto,
      req.userId,
    );
    res.status(200).json({
      message: "Add alert updated successfully",
      data: alert,
    });
  });

  deleteAddAlert = asyncHandler(async (req: CustomRequest, res: Response) => {
    await this.addAlertService.deleteAddAlert(
      this.getExternalId(req),
      req.userId,
    );
    res.status(200).json({
      message: "Add alert deleted successfully",
    });
  });

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid add alert ID", 400);
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
