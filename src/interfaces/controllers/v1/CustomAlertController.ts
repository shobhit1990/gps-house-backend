import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateCustomAlertDto,
  UpdateCustomAlertDto,
} from "../../../domain/dto/CustomAlertDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { ICustomAlertService } from "../../../services/interfaces/ICustomAlertService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class CustomAlertController {
  constructor(
    @inject("ICustomAlertService")
    private readonly customAlertService: ICustomAlertService,
  ) {}

  getCustomAlerts = asyncHandler(async (_req: Request, res: Response) => {
    const alerts = await this.customAlertService.getCustomAlerts();
    res.status(200).json({
      message: "Custom alert list fetched successfully",
      data: alerts,
    });
  });

  getCustomAlertById = asyncHandler(async (req: Request, res: Response) => {
    const alert = await this.customAlertService.getCustomAlertById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Custom alert fetched successfully",
      data: alert,
    });
  });

  createCustomAlert = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(CreateCustomAlertDto, req.body);
      await this.validateDto(dto);
      const alert = await this.customAlertService.createCustomAlert(
        dto,
        req.userId,
      );
      res.status(201).json({
        message: "Custom alert created successfully",
        data: alert,
      });
    },
  );

  updateCustomAlert = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(UpdateCustomAlertDto, req.body);
      await this.validateDto(dto);
      const alert = await this.customAlertService.updateCustomAlert(
        this.getExternalId(req),
        dto,
        req.userId,
      );
      res.status(200).json({
        message: "Custom alert updated successfully",
        data: alert,
      });
    },
  );

  deleteCustomAlert = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      await this.customAlertService.deleteCustomAlert(
        this.getExternalId(req),
        req.userId,
      );
      res.status(200).json({
        message: "Custom alert deleted successfully",
      });
    },
  );

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid custom alert ID", 400);
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
