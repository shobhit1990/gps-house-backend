import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateDeviceDto,
  UpdateDeviceDto,
} from "../../../domain/dto/DeviceDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { IDeviceService } from "../../../services/interfaces/IDeviceService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class DeviceController {
  constructor(
    @inject("IDeviceService")
    private readonly deviceService: IDeviceService,
  ) {}

  getDevices = asyncHandler(async (_req: Request, res: Response) => {
    const devices = await this.deviceService.getDevices();
    res.status(200).json({
      message: "Device list fetched successfully",
      data: devices,
    });
  });

  getDeviceById = asyncHandler(async (req: Request, res: Response) => {
    const device = await this.deviceService.getDeviceById(
      this.getParam(req, "externalId", "device ID"),
    );
    res.status(200).json({
      message: "Device fetched successfully",
      data: device,
    });
  });

  getAvailableInventories = asyncHandler(
    async (_req: Request, res: Response) => {
      const inventories = await this.deviceService.getAvailableInventories();
      res.status(200).json({
        message: "Available inventory list fetched successfully",
        data: inventories,
      });
    },
  );

  getAvailableInventoryByImei = asyncHandler(
    async (req: Request, res: Response) => {
      const inventory = await this.deviceService.getAvailableInventoryByImei(
        this.getParam(req, "imei", "IMEI"),
      );
      res.status(200).json({
        message: "Inventory item fetched successfully",
        data: inventory,
      });
    },
  );

  createDevice = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(CreateDeviceDto, req.body);
    await this.validateDto(dto);
    const device = await this.deviceService.createDevice(dto, req.userId);
    res.status(201).json({
      message: "Device created successfully",
      data: device,
    });
  });

  updateDevice = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(UpdateDeviceDto, req.body);
    await this.validateDto(dto);
    const device = await this.deviceService.updateDevice(
      this.getParam(req, "externalId", "device ID"),
      dto,
      req.userId,
    );
    res.status(200).json({
      message: "Device updated successfully",
      data: device,
    });
  });

  deleteDevice = asyncHandler(async (req: CustomRequest, res: Response) => {
    await this.deviceService.deleteDevice(
      this.getParam(req, "externalId", "device ID"),
      req.userId,
    );
    res.status(200).json({ message: "Device deleted successfully" });
  });

  private getParam(req: Request, name: string, label: string): string {
    const param = req.params[name];
    const value = Array.isArray(param) ? param[0] : param;
    if (typeof value !== "string" || !value.trim()) {
      throw new AppError(`Invalid ${label}`, 400);
    }
    return value.trim();
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
