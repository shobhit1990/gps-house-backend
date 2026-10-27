import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { inject, injectable } from "tsyringe";
import {
  CreatePaymentDetailsDto,
  UpdatePaymentDetailsDto,
} from "../../../domain/dto/PaymentDetailsDto";
import { IPaymentDetailsService } from "../../../services/interfaces/IPaymentDetailsService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class PaymentDetailsController {
  constructor(
    @inject("IPaymentDetailsService")
    private readonly paymentDetailsService: IPaymentDetailsService,
  ) {}

  getPaymentDetails = asyncHandler(async (_req: Request, res: Response) => {
    const paymentDetails = await this.paymentDetailsService.getPaymentDetails();
    res.status(200).json({
      message: "Payment details list fetched successfully",
      data: paymentDetails,
    });
  });

  getPaymentDetailsById = asyncHandler(async (req: Request, res: Response) => {
    const paymentDetails =
      await this.paymentDetailsService.getPaymentDetailsById(
        this.getExternalId(req),
      );
    res.status(200).json({
      message: "Payment details fetched successfully",
      data: paymentDetails,
    });
  });

  createPaymentDetails = asyncHandler(async (req: Request, res: Response) => {
    const dto = plainToInstance(CreatePaymentDetailsDto, req.body, {
      enableImplicitConversion: true,
    });
    await this.validateDto(dto);
    const paymentDetails =
      await this.paymentDetailsService.createPaymentDetails(dto);
    res.status(201).json({
      message: "Payment details created successfully",
      data: paymentDetails,
    });
  });

  updatePaymentDetails = asyncHandler(async (req: Request, res: Response) => {
    const dto = plainToInstance(UpdatePaymentDetailsDto, req.body, {
      enableImplicitConversion: true,
    });
    await this.validateDto(dto);
    const paymentDetails =
      await this.paymentDetailsService.updatePaymentDetails(
        this.getExternalId(req),
        dto,
      );
    res.status(200).json({
      message: "Payment details updated successfully",
      data: paymentDetails,
    });
  });

  deletePaymentDetails = asyncHandler(async (req: Request, res: Response) => {
    await this.paymentDetailsService.deletePaymentDetails(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Payment details deleted successfully",
    });
  });

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid payment details ID", 400);
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
