import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateParkedScheduleDto,
  UpdateParkedScheduleDto,
} from "../../../domain/dto/ParkedScheduleDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { IParkedScheduleService } from "../../../services/interfaces/IParkedScheduleService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class ParkedScheduleController {
  constructor(
    @inject("IParkedScheduleService")
    private readonly service: IParkedScheduleService,
  ) {}

  getParkedSchedules = asyncHandler(async (_req: Request, res: Response) => {
    const schedules = await this.service.getParkedSchedules();
    res.status(200).json({
      message: "Parked schedule list fetched successfully",
      data: schedules,
    });
  });

  getParkedScheduleById = asyncHandler(async (req: Request, res: Response) => {
    const schedule = await this.service.getParkedScheduleById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Parked schedule fetched successfully",
      data: schedule,
    });
  });

  createParkedSchedule = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(CreateParkedScheduleDto, req.body);
      await this.validateDto(dto);
      const schedule = await this.service.createParkedSchedule(dto, req.userId);
      res.status(201).json({
        message: "Parked schedule created successfully",
        data: schedule,
      });
    },
  );

  updateParkedSchedule = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(UpdateParkedScheduleDto, req.body);
      await this.validateDto(dto);
      const schedule = await this.service.updateParkedSchedule(
        this.getExternalId(req),
        dto,
        req.userId,
      );
      res.status(200).json({
        message: "Parked schedule updated successfully",
        data: schedule,
      });
    },
  );

  deleteParkedSchedule = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      await this.service.deleteParkedSchedule(
        this.getExternalId(req),
        req.userId,
      );
      res.status(200).json({ message: "Parked schedule deleted successfully" });
    },
  );

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid parked schedule ID", 400);
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
