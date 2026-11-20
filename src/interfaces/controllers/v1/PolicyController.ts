import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreatePolicyDto,
  UpdatePolicyDto,
} from "../../../domain/dto/PolicyDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { IPolicyService } from "../../../services/interfaces/IPolicyService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class PolicyController {
  constructor(
    @inject("IPolicyService")
    private readonly policyService: IPolicyService,
  ) {}

  getPolicies = asyncHandler(async (_req: Request, res: Response) => {
    const policies = await this.policyService.getPolicies();
    res.set("Cache-Control", "no-store");
    res.status(200).json({
      message: "Policy list fetched successfully",
      data: policies,
    });
  });

  getPolicyById = asyncHandler(async (req: Request, res: Response) => {
    const policy = await this.policyService.getPolicyById(
      this.getExternalId(req),
    );
    res.set("Cache-Control", "no-store");
    res.status(200).json({
      message: "Policy fetched successfully",
      data: policy,
    });
  });

  createPolicy = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(CreatePolicyDto, req.body, {
      enableImplicitConversion: true,
    });
    await this.validateDto(dto);
    const policy = await this.policyService.createPolicy(dto, req.userId);
    res.status(201).json({
      message: "Policy created successfully",
      data: policy,
    });
  });

  updatePolicy = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(UpdatePolicyDto, req.body, {
      enableImplicitConversion: true,
    });
    await this.validateDto(dto);
    const policy = await this.policyService.updatePolicy(
      this.getExternalId(req),
      dto,
      req.userId,
    );
    res.status(200).json({
      message: "Policy updated successfully",
      data: policy,
    });
  });

  deletePolicy = asyncHandler(async (req: CustomRequest, res: Response) => {
    await this.policyService.deletePolicy(
      this.getExternalId(req),
      req.userId,
    );
    res.status(200).json({
      message: "Policy deleted successfully",
    });
  });

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid policy ID", 400);
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
