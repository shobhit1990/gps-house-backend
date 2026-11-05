import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateLicenseDto,
  UpdateLicenseDto,
} from "../../../domain/dto/LicenseDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { ILicenseService } from "../../../services/interfaces/ILicenseService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class LicenseController {
  constructor(
    @inject("ILicenseService")
    private readonly licenseService: ILicenseService,
  ) {}

  getLicenses = asyncHandler(async (_req: Request, res: Response) => {
    const licenses = await this.licenseService.getLicenses();
    res.status(200).json({
      message: "License list fetched successfully",
      data: licenses,
    });
  });

  getLicenseById = asyncHandler(async (req: Request, res: Response) => {
    const license = await this.licenseService.getLicenseById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "License fetched successfully",
      data: license,
    });
  });

  createLicense = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(CreateLicenseDto, req.body, {
      enableImplicitConversion: true,
    });
    await this.validateDto(dto);
    const license = await this.licenseService.createLicense(dto, req.userId);
    res.status(201).json({
      message: "License created successfully",
      data: license,
    });
  });

  updateLicense = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(UpdateLicenseDto, req.body, {
      enableImplicitConversion: true,
    });
    await this.validateDto(dto);
    const license = await this.licenseService.updateLicense(
      this.getExternalId(req),
      dto,
      req.userId,
    );
    res.status(200).json({
      message: "License updated successfully",
      data: license,
    });
  });

  deleteLicense = asyncHandler(async (req: CustomRequest, res: Response) => {
    await this.licenseService.deleteLicense(
      this.getExternalId(req),
      req.userId,
    );
    res.status(200).json({
      message: "License deleted successfully",
    });
  });

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid license ID", 400);
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
