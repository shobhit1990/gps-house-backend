import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { inject, injectable } from "tsyringe";
import {
  CreateAddVehicleDto,
  UpdateAddVehicleDto,
} from "../../../domain/dto/AddVehicleDto";
import { StoppageSummaryFilterDto } from "../../../domain/dto/StoppageSummaryDto";
import { Minutes } from "../../../domain/enums/Minutes";
import {
  StoppageSummaryFilter,
  SubscriptionReportFilter,
} from "../../../domain/repositories/mysql/IAddVehicleRepository";
import { IAddVehicleService } from "../../../services/interfaces/IAddVehicleService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class AddVehicleController {
  constructor(
    @inject("IAddVehicleService")
    private readonly vehicleService: IAddVehicleService,
  ) {}

  getAddVehicle = asyncHandler(async (req: Request, res: Response) => {
    const vehicles = await this.vehicleService.getAddVehicle(
      this.parseReportFilter(req),
    );
    res.status(200).json({
      message: "Vehicle list fetched successfully",
      data: vehicles,
    });
  });

  getAddVehicleById = asyncHandler(
    async (req: Request, res: Response) => {
      const externalId = this.getExternalId(req);
      const vehicle = await this.vehicleService.getAddVehicleById(externalId);
      res.status(200).json({
        message: "Vehicle fetched successfully",
        data: vehicle,
      });
    },
  );

  getSubscriptionExpiredReport = asyncHandler(
    async (req: Request, res: Response) => {
      const report = await this.vehicleService.getSubscriptionExpiredReport(
        this.parseReportFilter(req),
      );
      res.status(200).json({
        message: "Subscription expired report fetched successfully",
        data: report,
      });
    },
  );

  getSubscriptionChangedReport = asyncHandler(
    async (req: Request, res: Response) => {
      const report = await this.vehicleService.getSubscriptionChangedReport(
        this.parseReportFilter(req),
      );
      res.status(200).json({
        message: "Subscription changed report fetched successfully",
        data: report,
      });
    },
  );

  getVehicleLogReport = asyncHandler(async (req: Request, res: Response) => {
    const report = await this.vehicleService.getVehicleLogReport({
      modifiedType: this.parseOptionalQueryString(
        req.query.modifiedType,
        "modifiedType",
      ),
      month: this.parseOptionalQueryString(req.query.month, "month"),
      year: this.parseOptionalQueryString(req.query.year, "year"),
      search: this.parseOptionalQueryString(req.query.search, "search"),
    });
    res.status(200).json({
      message: "Vehicle log report fetched successfully",
      data: report,
    });
  });

  getStoppageSummaryReport = asyncHandler(
    async (req: Request, res: Response) => {
      const filter = await this.parseStoppageSummaryFilter(req);
      const report =
        await this.vehicleService.getStoppageSummaryReport(filter);
      res.status(200).json({
        message: "Stoppage summary report fetched successfully",
        filter: {
          client: filter.clientExternalId ?? null,
          transporter: filter.transporterExternalId ?? null,
          vehicle: filter.vehicleExternalId ?? null,
          duration: filter.duration,
          startDate: filter.startDate.toISOString(),
          endDate: filter.endDate.toISOString(),
        },
        data: report,
      });
    },
  );

  createAddVehicle = asyncHandler(async (req: Request, res: Response) => {
    const dto = plainToInstance(CreateAddVehicleDto, req.body, {
      enableImplicitConversion: true,
    });
    await this.validateDto(dto);
    const vehicle = await this.vehicleService.createAddVehicle(dto);
    res.status(201).json({
      message: "Vehicle created successfully",
      data: vehicle,
    });
  });

  updateAddVehicle = asyncHandler(async (req: Request, res: Response) => {
    const externalId = this.getExternalId(req);
    const dto = plainToInstance(UpdateAddVehicleDto, req.body, {
      enableImplicitConversion: true,
    });
    await this.validateDto(dto);
    const vehicle = await this.vehicleService.updateAddVehicle(externalId, dto);
    res.status(200).json({
      message: "Vehicle updated successfully",
      data: vehicle,
    });
  });

  deleteAddVehicle = asyncHandler(async (req: Request, res: Response) => {
    const externalId = this.getExternalId(req);
    await this.vehicleService.deleteAddVehicle(externalId);
    res.status(200).json({ message: "Vehicle deleted successfully" });
  });

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid vehicle ID", 400);
    }
    return externalId;
  }

  private parseReportFilter(req: Request): SubscriptionReportFilter {
    return {
      clientExternalId: this.parseOptionalQueryString(
        req.query.client,
        "client",
      ),
      transporterExternalId: this.parseOptionalQueryString(
        req.query.transporter,
        "transporter",
      ),
      vehicleExternalId: this.parseOptionalQueryString(
        req.query.vehicle,
        "vehicle",
      ),
    };
  }

  private async parseStoppageSummaryFilter(
    req: Request,
  ): Promise<StoppageSummaryFilter> {
    const dto = plainToInstance(StoppageSummaryFilterDto, req.query, {
      enableImplicitConversion: true,
    });
    await this.validateDto(dto);

    return {
      clientExternalId: dto.client,
      transporterExternalId: dto.transporter,
      vehicleExternalId: dto.vehicle,
      duration: dto.duration as Minutes,
      startDate: this.parseDateTime(dto.startDate, "startDate"),
      endDate: this.parseDateTime(dto.endDate, "endDate"),
    };
  }

  private parseDateTime(value: string, fieldName: string): Date {
    const trimmed = value.trim();
    const isoCandidate = new Date(trimmed);
    if (!Number.isNaN(isoCandidate.getTime()) && !/^\d{1,2}\//.test(trimmed)) {
      return isoCandidate;
    }

    // Supports UI format: DD/MM/YYYY HH:mm or DD/MM/YYYY
    const match = trimmed.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
    );
    if (!match) {
      throw new AppError(
        `Invalid ${fieldName}. Use ISO datetime or DD/MM/YYYY HH:mm`,
        400,
      );
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const hours = Number(match[4] ?? 0);
    const minutes = Number(match[5] ?? 0);
    const seconds = Number(match[6] ?? 0);
    const parsed = new Date(year, month - 1, day, hours, minutes, seconds);

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      throw new AppError(`Invalid ${fieldName}`, 400);
    }

    return parsed;
  }

  private parseOptionalQueryString(
    value: unknown,
    fieldName: string,
  ): string | undefined {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    const raw = Array.isArray(value) ? value[0] : value;
    if (typeof raw !== "string" || !raw.trim()) {
      throw new AppError(`Invalid ${fieldName}`, 400);
    }
    return raw.trim();
  }

  private async validateDto(dto: object): Promise<void> {
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: false,
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
