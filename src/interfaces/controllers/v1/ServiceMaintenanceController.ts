import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateServiceMaintenanceDto,
  UpdateServiceMaintenanceDto,
} from "../../../domain/dto/ServiceMaintenanceDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { IServiceMaintenanceService } from "../../../services/interfaces/IServiceMaintenanceService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class ServiceMaintenanceController {
  constructor(
    @inject("IServiceMaintenanceService")
    private readonly serviceMaintenanceService: IServiceMaintenanceService,
  ) {}

  getServiceMaintenances = asyncHandler(
    async (_req: Request, res: Response) => {
      const details =
        await this.serviceMaintenanceService.getServiceMaintenances();
      res.status(200).json({
        message: "Service maintenance list fetched successfully",
        data: details,
      });
    },
  );

  getServiceMaintenanceById = asyncHandler(
    async (req: Request, res: Response) => {
      const detail =
        await this.serviceMaintenanceService.getServiceMaintenanceById(
          this.getExternalId(req),
        );
      res.status(200).json({
        message: "Service maintenance detail fetched successfully",
        data: detail,
      });
    },
  );

  createServiceMaintenance = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(CreateServiceMaintenanceDto, req.body);
      await this.validateDto(dto);
      const detail =
        await this.serviceMaintenanceService.createServiceMaintenance(
          dto,
          req.userId,
          req.file ? `/uploads/${req.file.filename}` : undefined,
        );
      res.status(201).json({
        message: "Service maintenance detail created successfully",
        data: detail,
      });
    },
  );

  updateServiceMaintenance = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(UpdateServiceMaintenanceDto, req.body);
      await this.validateDto(dto);
      const detail =
        await this.serviceMaintenanceService.updateServiceMaintenance(
          this.getExternalId(req),
          dto,
          req.userId,
          req.file ? `/uploads/${req.file.filename}` : undefined,
        );
      res.status(200).json({
        message: "Service maintenance detail updated successfully",
        data: detail,
      });
    },
  );

  deleteServiceMaintenance = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      await this.serviceMaintenanceService.deleteServiceMaintenance(
        this.getExternalId(req),
        req.userId,
      );
      res.status(200).json({
        message: "Service maintenance detail deleted successfully",
      });
    },
  );

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid service maintenance ID", 400);
    }
    return externalId;
  }

  private async validateDto(dto: object): Promise<void> {
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      throw new AppError(
        "Validation failed. Please check the errors and try again.",
        400,
        null,
        formatValidationErrors(errors),
      );
    }
  }
}
