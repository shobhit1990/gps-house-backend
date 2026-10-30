import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateDeviceTypeDto,
  UpdateDeviceTypeDto,
} from "../../../domain/dto/DeviceTypeDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { IDeviceTypeService } from "../../../services/interfaces/IDeviceTypeService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class DeviceTypeController {
  constructor(
    @inject("IDeviceTypeService")
    private readonly deviceTypeService: IDeviceTypeService,
  ) {}

  getDeviceTypes = asyncHandler(async (_req: Request, res: Response) => {
    const deviceTypes = await this.deviceTypeService.getDeviceTypes();
    res.status(200).json({
      message: "Device type list fetched successfully",
      data: deviceTypes,
    });
  });

  getDeviceTypeById = asyncHandler(async (req: Request, res: Response) => {
    const deviceType = await this.deviceTypeService.getDeviceTypeById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Device type fetched successfully",
      data: deviceType,
    });
  });

  createDeviceType = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(CreateDeviceTypeDto, req.body, {
      enableImplicitConversion: true,
    });
    await this.validateDto(dto);
    const deviceType = await this.deviceTypeService.createDeviceType(
      dto,
      req.userId,
    );
    res.status(201).json({
      message: "Device type created successfully",
      data: deviceType,
    });
  });

  updateDeviceType = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(UpdateDeviceTypeDto, req.body, {
      enableImplicitConversion: true,
    });
    await this.validateDto(dto);
    const deviceType = await this.deviceTypeService.updateDeviceType(
      this.getExternalId(req),
      dto,
      req.userId,
    );
    res.status(200).json({
      message: "Device type updated successfully",
      data: deviceType,
    });
  });

  deleteDeviceType = asyncHandler(async (req: CustomRequest, res: Response) => {
    await this.deviceTypeService.deleteDeviceType(
      this.getExternalId(req),
      req.userId,
    );
    res.status(200).json({
      message: "Device type deleted successfully",
    });
  });

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid device type ID", 400);
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
