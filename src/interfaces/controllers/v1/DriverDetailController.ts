import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateDriverDetailDto,
  UpdateDriverDetailDto,
} from "../../../domain/dto/DriverDetailDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { IDriverDetailService } from "../../../services/interfaces/IDriverDetailService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class DriverDetailController {
  constructor(
    @inject("IDriverDetailService")
    private readonly driverDetailService: IDriverDetailService,
  ) {}

  getDriverDetails = asyncHandler(async (_req: Request, res: Response) => {
    const details = await this.driverDetailService.getDriverDetails();
    res.status(200).json({
      message: "Driver detail list fetched successfully",
      data: details,
    });
  });

  downloadDriverDetailExport = asyncHandler(
    async (_req: Request, res: Response) => {
      const workbook = await this.driverDetailService.getDriverDetailExport();
      res.status(200).set({
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="driver-detail-export.xlsx"',
        "Content-Length": String(workbook.length),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(workbook);
    },
  );

  bulkUploadDriverDetails = asyncHandler(
    async (
      req: CustomRequest & { file?: Express.Multer.File },
      res: Response,
    ) => {
      const client =
        typeof req.body?.client === "string" ? req.body.client.trim() : "";
      const transporter =
        typeof req.body?.transporter === "string"
          ? req.body.transporter.trim()
          : "";

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "Driver detail upload validation failed",
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

      const result = await this.driverDetailService.bulkUploadDriverDetails(
        req.file.originalname,
        req.file.buffer,
        client,
        transporter,
        req.userExternalId,
      );
      const { httpStatus, ...response } = result;
      res.status(httpStatus).json(response);
    },
  );

  getDriverDetailById = asyncHandler(async (req: Request, res: Response) => {
    const detail = await this.driverDetailService.getDriverDetailById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Driver detail fetched successfully",
      data: detail,
    });
  });

  createDriverDetail = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(CreateDriverDetailDto, req.body, {
        enableImplicitConversion: true,
      });
      await this.validateDto(dto);
      const detail = await this.driverDetailService.createDriverDetail(
        dto,
        req.userExternalId,
      );
      res.status(201).json({
        message: "Driver detail created successfully",
        data: detail,
      });
    },
  );

  updateDriverDetail = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(UpdateDriverDetailDto, req.body, {
        enableImplicitConversion: true,
      });
      await this.validateDto(dto);
      const detail = await this.driverDetailService.updateDriverDetail(
        this.getExternalId(req),
        dto,
        req.userExternalId,
      );
      res.status(200).json({
        message: "Driver detail updated successfully",
        data: detail,
      });
    },
  );

  deleteDriverDetail = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      await this.driverDetailService.deleteDriverDetail(
        this.getExternalId(req),
        req.userExternalId,
      );
      res.status(200).json({
        message: "Driver detail deleted successfully",
      });
    },
  );

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid driver detail ID", 400);
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
