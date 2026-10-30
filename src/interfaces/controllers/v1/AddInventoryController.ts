import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateAddInventoryDto,
  UpdateAddInventoryDto,
} from "../../../domain/dto/AddInventoryDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { IAddInventoryService } from "../../../services/interfaces/IAddInventoryService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class AddInventoryController {
  constructor(
    @inject("IAddInventoryService")
    private readonly inventoryService: IAddInventoryService,
  ) {}

  getAddInventories = asyncHandler(async (_req: Request, res: Response) => {
    const inventories = await this.inventoryService.getAddInventories();
    res.status(200).json({
      message: "Inventory list fetched successfully",
      data: inventories,
    });
  });

  getAddInventoryById = asyncHandler(async (req: Request, res: Response) => {
    const inventory = await this.inventoryService.getAddInventoryById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Inventory fetched successfully",
      data: inventory,
    });
  });

  createAddInventory = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(CreateAddInventoryDto, req.body);
      await this.validateDto(dto);
      const inventory = await this.inventoryService.createAddInventory(
        dto,
        req.userId,
      );
      res.status(201).json({
        message: "Inventory created successfully",
        data: inventory,
      });
    },
  );

  updateAddInventory = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(UpdateAddInventoryDto, req.body);
      await this.validateDto(dto);
      const inventory = await this.inventoryService.updateAddInventory(
        this.getExternalId(req),
        dto,
        req.userId,
      );
      res.status(200).json({
        message: "Inventory updated successfully",
        data: inventory,
      });
    },
  );

  deleteAddInventory = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      await this.inventoryService.deleteAddInventory(
        this.getExternalId(req),
        req.userId,
      );
      res.status(200).json({
        message: "Inventory deleted successfully",
      });
    },
  );

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid inventory ID", 400);
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
