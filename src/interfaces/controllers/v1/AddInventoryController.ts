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

  downloadAddInventoryExport = asyncHandler(
    async (_req: Request, res: Response) => {
      const workbook = await this.inventoryService.getAddInventoryExport();
      res.status(200).set({
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="device-inventory-export.xlsx"',
        "Content-Length": String(workbook.length),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(workbook);
    },
  );

  bulkUploadAddInventories = asyncHandler(
    async (
      req: CustomRequest & { file?: Express.Multer.File },
      res: Response,
    ) => {
      const assignType =
        typeof req.body?.assignType === "string" ? req.body.assignType : "";
      const inventoryType =
        typeof req.body?.inventoryType === "string"
          ? req.body.inventoryType
          : undefined;

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "Inventory upload validation failed",
          totalRecords: 0,
          insertedRecords: 0,
          duplicateRecords: 0,
          failedRecords: 0,
          errors: [
            {
              row: 1,
              column: "file",
              message: "Excel file is required in the 'file' field",
            },
          ],
        });
        return;
      }

      const result = await this.inventoryService.bulkUploadAddInventories(
        req.file.originalname,
        req.file.buffer,
        assignType,
        inventoryType,
        req.userId,
      );
      const { httpStatus, ...response } = result;
      res.status(httpStatus).json(response);
    },
  );

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
