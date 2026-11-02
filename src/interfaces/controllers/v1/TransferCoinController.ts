import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateTransferCoinDto,
  UpdateTransferCoinDto,
} from "../../../domain/dto/TransferCoinDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { ITransferCoinService } from "../../../services/interfaces/ITransferCoinService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class TransferCoinController {
  constructor(
    @inject("ITransferCoinService")
    private readonly service: ITransferCoinService,
  ) {}

  getTransferCoins = asyncHandler(async (_req: Request, res: Response) => {
    const records = await this.service.getTransferCoins();
    res.status(200).json({
      message: "Transfer coin list fetched successfully",
      data: records,
    });
  });

  getTransferCoinById = asyncHandler(async (req: Request, res: Response) => {
    const record = await this.service.getTransferCoinById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Transfer coin fetched successfully",
      data: record,
    });
  });

  createTransferCoin = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(CreateTransferCoinDto, req.body, {
        enableImplicitConversion: true,
      });
      await this.validateDto(dto);
      const record = await this.service.createTransferCoin(dto, req.userId);
      res.status(201).json({
        message: "Transfer coin created successfully",
        data: record,
      });
    },
  );

  updateTransferCoin = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(UpdateTransferCoinDto, req.body, {
        enableImplicitConversion: true,
      });
      await this.validateDto(dto);
      const record = await this.service.updateTransferCoin(
        this.getExternalId(req),
        dto,
        req.userId,
      );
      res.status(200).json({
        message: "Transfer coin updated successfully",
        data: record,
      });
    },
  );

  deleteTransferCoin = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      await this.service.deleteTransferCoin(
        this.getExternalId(req),
        req.userId,
      );
      res.status(200).json({ message: "Transfer coin deleted successfully" });
    },
  );

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid transfer coin ID", 400);
    }
    return externalId;
  }

  private async validateDto(dto: object): Promise<void> {
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      throw new AppError(
        "Validation failed. Please check the errors and try again.",
        400,
        null,
        formatValidationErrors(errors),
      );
    }
  }
}
