import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateVehicleConfigDto,
  UpdateVehicleConfigDto,
} from "../../../domain/dto/VehicleConfigDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { IVehicleConfigService } from "../../../services/interfaces/IVehicleConfigService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class VehicleConfigController {
  constructor(
    @inject("IVehicleConfigService")
    private readonly service: IVehicleConfigService,
  ) {}

  getVehicleConfigs = asyncHandler(async (_req: Request, res: Response) => {
    const configs = await this.service.getVehicleConfigs();
    res.status(200).json({
      message: "Vehicle config list fetched successfully",
      data: configs,
    });
  });

  getVehicleConfigById = asyncHandler(async (req: Request, res: Response) => {
    const config = await this.service.getVehicleConfigById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Vehicle config fetched successfully",
      data: config,
    });
  });

  createVehicleConfig = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(CreateVehicleConfigDto, req.body);
      await this.validateDto(dto);
      const config = await this.service.createVehicleConfig(dto, req.userId);
      res.status(201).json({
        message: "Vehicle config created successfully",
        data: config,
      });
    },
  );

  updateVehicleConfig = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(UpdateVehicleConfigDto, req.body);
      await this.validateDto(dto);
      const config = await this.service.updateVehicleConfig(
        this.getExternalId(req),
        dto,
        req.userId,
      );
      res.status(200).json({
        message: "Vehicle config updated successfully",
        data: config,
      });
    },
  );

  deleteVehicleConfig = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      await this.service.deleteVehicleConfig(
        this.getExternalId(req),
        req.userId,
      );
      res.status(200).json({ message: "Vehicle config deleted successfully" });
    },
  );

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid vehicle config ID", 400);
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
