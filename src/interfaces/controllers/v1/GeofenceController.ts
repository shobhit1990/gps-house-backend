import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateGeofenceDto,
  UpdateGeofenceDto,
} from "../../../domain/dto/GeofenceDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { IGeofenceService } from "../../../services/interfaces/IGeofenceService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class GeofenceController {
  constructor(
    @inject("IGeofenceService")
    private readonly geofenceService: IGeofenceService,
  ) {}

  getGeofences = asyncHandler(async (_req: Request, res: Response) => {
    const geofences = await this.geofenceService.getGeofences();
    res.status(200).json({
      message: "Geofence list fetched successfully",
      data: geofences,
    });
  });

  getGeofenceById = asyncHandler(async (req: Request, res: Response) => {
    const geofence = await this.geofenceService.getGeofenceById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Geofence fetched successfully",
      data: geofence,
    });
  });

  createGeofence = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(CreateGeofenceDto, req.body, {
      enableImplicitConversion: true,
    });
    await this.validateDto(dto);
    const geofence = await this.geofenceService.createGeofence(dto, req.userId);
    res.status(201).json({
      message: "Geofence created successfully",
      data: geofence,
    });
  });

  updateGeofence = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(UpdateGeofenceDto, req.body, {
      enableImplicitConversion: true,
    });
    await this.validateDto(dto);
    const geofence = await this.geofenceService.updateGeofence(
      this.getExternalId(req),
      dto,
      req.userId,
    );
    res.status(200).json({
      message: "Geofence updated successfully",
      data: geofence,
    });
  });

  deleteGeofence = asyncHandler(async (req: CustomRequest, res: Response) => {
    await this.geofenceService.deleteGeofence(
      this.getExternalId(req),
      req.userId,
    );
    res.status(200).json({
      message: "Geofence deleted successfully",
    });
  });

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid geofence ID", 400);
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
