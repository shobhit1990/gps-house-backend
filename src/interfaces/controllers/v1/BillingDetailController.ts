import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { inject, injectable } from "tsyringe";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import {
  CreateBillingDetailDto,
  UpdateBillingDetailDto,
} from "../../../domain/dto/BillingDetailDto";
import { IBillingDetailService } from "../../../services/interfaces/IBillingDetailService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class BillingDetailController {
  constructor(
    @inject("IBillingDetailService")
    private readonly billingDetailService: IBillingDetailService,
  ) {}

  getBillingDetails = asyncHandler(async (_req: Request, res: Response) => {
    const billingDetails = await this.billingDetailService.getBillingDetails();
    res.status(200).json({
      message: "Billing details list fetched successfully",
      data: billingDetails,
    });
  });

  getBillingDetailById = asyncHandler(async (req: Request, res: Response) => {
    const billingDetail = await this.billingDetailService.getBillingDetailById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Billing detail fetched successfully",
      data: billingDetail,
    });
  });

  createBillingDetail = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(CreateBillingDetailDto, req.body, {
        enableImplicitConversion: true,
      });
      await this.validateDto(dto);
      const billingDetail = await this.billingDetailService.createBillingDetail(
        dto,
        req.userId,
      );
      res.status(201).json({
        message: "Billing detail created successfully",
        data: billingDetail,
      });
    },
  );

  updateBillingDetail = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(UpdateBillingDetailDto, req.body, {
        enableImplicitConversion: true,
      });
      await this.validateDto(dto);
      const billingDetail = await this.billingDetailService.updateBillingDetail(
        this.getExternalId(req),
        dto,
        req.userId,
      );
      res.status(200).json({
        message: "Billing detail updated successfully",
        data: billingDetail,
      });
    },
  );

  deleteBillingDetail = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      await this.billingDetailService.deleteBillingDetail(
        this.getExternalId(req),
        req.userId,
      );
      res.status(200).json({
        message: "Billing detail deleted successfully",
      });
    },
  );

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid billing detail ID", 400);
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
