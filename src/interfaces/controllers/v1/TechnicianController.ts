import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { inject, injectable } from "tsyringe";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import {
  CreateTechnicianDto,
  UpdateTechnicianDto,
} from "../../../domain/dto/TechnicianDto";
import { ITechnicianService } from "../../../services/interfaces/ITechnicianService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class TechnicianController {
  constructor(
    @inject("ITechnicianService")
    private readonly technicianService: ITechnicianService,
  ) {}

  getTechnicians = asyncHandler(async (_req: Request, res: Response) => {
    const technicians = await this.technicianService.getTechnicians();
    res.status(200).json({
      message: "Technician list fetched successfully",
      data: technicians,
    });
  });

  getTechnicianById = asyncHandler(async (req: Request, res: Response) => {
    const technician = await this.technicianService.getTechnicianById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Technician fetched successfully",
      data: technician,
    });
  });

  createTechnician = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(CreateTechnicianDto, req.body, {
      enableImplicitConversion: true,
    });
    await this.validateDto(dto);
    const technician = await this.technicianService.createTechnician(
      dto,
      req.userId,
    );
    res.status(201).json({
      message: "Technician created successfully",
      data: technician,
    });
  });

  updateTechnician = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(UpdateTechnicianDto, req.body, {
      enableImplicitConversion: true,
    });
    await this.validateDto(dto);
    const technician = await this.technicianService.updateTechnician(
      this.getExternalId(req),
      dto,
      req.userId,
    );
    res.status(200).json({
      message: "Technician updated successfully",
      data: technician,
    });
  });

  deleteTechnician = asyncHandler(async (req: CustomRequest, res: Response) => {
    await this.technicianService.deleteTechnician(
      this.getExternalId(req),
      req.userId,
    );
    res.status(200).json({
      message: "Technician deleted successfully",
    });
  });

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid technician ID", 400);
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
