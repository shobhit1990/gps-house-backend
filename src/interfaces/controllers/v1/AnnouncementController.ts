import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from "../../../domain/dto/AnnouncementDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { IAnnouncementService } from "../../../services/interfaces/IAnnouncementService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class AnnouncementController {
  constructor(
    @inject("IAnnouncementService")
    private readonly service: IAnnouncementService,
  ) {}

  getAnnouncements = asyncHandler(async (_req: Request, res: Response) => {
    const announcements = await this.service.getAnnouncements();
    res.status(200).json({
      message: "Announcement list fetched successfully",
      data: announcements,
    });
  });

  getAnnouncementById = asyncHandler(async (req: Request, res: Response) => {
    const announcement = await this.service.getAnnouncementById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Announcement fetched successfully",
      data: announcement,
    });
  });

  createAnnouncement = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(CreateAnnouncementDto, req.body);
      await this.validateDto(dto);
      const announcement = await this.service.createAnnouncement(
        dto,
        req.userId,
        req.file ? `/uploads/${req.file.filename}` : undefined,
      );
      res.status(201).json({
        message: "Announcement created successfully",
        data: announcement,
      });
    },
  );

  updateAnnouncement = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(UpdateAnnouncementDto, req.body);
      await this.validateDto(dto);
      const announcement = await this.service.updateAnnouncement(
        this.getExternalId(req),
        dto,
        req.userId,
        req.file ? `/uploads/${req.file.filename}` : undefined,
      );
      res.status(200).json({
        message: "Announcement updated successfully",
        data: announcement,
      });
    },
  );

  deleteAnnouncement = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      await this.service.deleteAnnouncement(
        this.getExternalId(req),
        req.userId,
      );
      res.status(200).json({ message: "Announcement deleted successfully" });
    },
  );

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid announcement ID", 400);
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
