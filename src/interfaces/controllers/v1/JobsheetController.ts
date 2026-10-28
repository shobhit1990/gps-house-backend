import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { inject, injectable } from "tsyringe";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import {
  CreateJobsheetDto,
  UpdateJobsheetDto,
} from "../../../domain/dto/JobsheetDto";
import { IJobsheetService } from "../../../services/interfaces/IJobsheetService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class JobsheetController {
  constructor(
    @inject("IJobsheetService")
    private readonly jobsheetService: IJobsheetService,
  ) {}

  getJobsheets = asyncHandler(async (_req: Request, res: Response) => {
    const jobsheets = await this.jobsheetService.getJobsheets();
    res.status(200).json({
      message: "Jobsheet list fetched successfully",
      data: jobsheets,
    });
  });

  getJobsheetById = asyncHandler(async (req: Request, res: Response) => {
    const jobsheet = await this.jobsheetService.getJobsheetById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Jobsheet fetched successfully",
      data: jobsheet,
    });
  });

  createJobsheet = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(CreateJobsheetDto, req.body, {
      enableImplicitConversion: false,
    });
    await this.validateDto(dto);
    const jobsheet = await this.jobsheetService.createJobsheet(dto, req.userId);
    res.status(201).json({
      message: "Jobsheet created successfully",
      data: jobsheet,
    });
  });

  updateJobsheet = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(UpdateJobsheetDto, req.body, {
      enableImplicitConversion: false,
    });
    await this.validateDto(dto);
    const jobsheet = await this.jobsheetService.updateJobsheet(
      this.getExternalId(req),
      dto,
      req.userId,
    );
    res.status(200).json({
      message: "Jobsheet updated successfully",
      data: jobsheet,
    });
  });

  deleteJobsheet = asyncHandler(async (req: CustomRequest, res: Response) => {
    await this.jobsheetService.deleteJobsheet(
      this.getExternalId(req),
      req.userId,
    );
    res.status(200).json({ message: "Jobsheet deleted successfully" });
  });

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid jobsheet ID", 400);
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
