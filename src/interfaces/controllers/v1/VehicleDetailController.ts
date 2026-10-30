import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateVehicleDetailDto,
  UpdateVehicleDetailDto,
} from "../../../domain/dto/VehicleDetailDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { IVehicleDetailService } from "../../../services/interfaces/IVehicleDetailService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class VehicleDetailController {
  constructor(
    @inject("IVehicleDetailService")
    private readonly vehicleDetailService: IVehicleDetailService,
  ) {}

  getVehicleDetails = asyncHandler(async (_req: Request, res: Response) => {
    const details = await this.vehicleDetailService.getVehicleDetails();
    res.status(200).json({
      message: "Vehicle detail list fetched successfully",
      data: details,
    });
  });

  getVehicleDetailById = asyncHandler(async (req: Request, res: Response) => {
    const detail = await this.vehicleDetailService.getVehicleDetailById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Vehicle detail fetched successfully",
      data: detail,
    });
  });

  createVehicleDetail = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(CreateVehicleDetailDto, req.body, {
        enableImplicitConversion: true,
      });
      await this.validateDto(dto);
      const detail = await this.vehicleDetailService.createVehicleDetail(
        dto,
        req.userId,
      );
      res.status(201).json({
        message: "Vehicle detail created successfully",
        data: detail,
      });
    },
  );

  updateVehicleDetail = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(UpdateVehicleDetailDto, req.body, {
        enableImplicitConversion: true,
      });
      await this.validateDto(dto);
      const detail = await this.vehicleDetailService.updateVehicleDetail(
        this.getExternalId(req),
        dto,
        req.userId,
      );
      res.status(200).json({
        message: "Vehicle detail updated successfully",
        data: detail,
      });
    },
  );

  deleteVehicleDetail = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      await this.vehicleDetailService.deleteVehicleDetail(
        this.getExternalId(req),
        req.userId,
      );
      res.status(200).json({
        message: "Vehicle detail deleted successfully",
      });
    },
  );

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid vehicle detail ID", 400);
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
