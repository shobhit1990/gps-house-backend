import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateContactUsDto,
  UpdateContactUsDto,
} from "../../../domain/dto/ContactUsDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { IContactUsService } from "../../../services/interfaces/IContactUsService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class ContactUsController {
  constructor(
    @inject("IContactUsService")
    private readonly contactUsService: IContactUsService,
  ) {}

  getContactUsList = asyncHandler(async (_req: Request, res: Response) => {
    const list = await this.contactUsService.getContactUsList();
    res.status(200).json({
      message: "Contact us list fetched successfully",
      data: list,
    });
  });

  getContactUsById = asyncHandler(async (req: Request, res: Response) => {
    const contactUs = await this.contactUsService.getContactUsById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Contact us entry fetched successfully",
      data: contactUs,
    });
  });

  createContactUs = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(CreateContactUsDto, req.body);
    await this.validateDto(dto);
    const contactUs = await this.contactUsService.createContactUs(
      dto,
      req.userId,
    );
    res.status(201).json({
      message: "Contact us entry created successfully",
      data: contactUs,
    });
  });

  updateContactUs = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(UpdateContactUsDto, req.body);
    await this.validateDto(dto);
    const contactUs = await this.contactUsService.updateContactUs(
      this.getExternalId(req),
      dto,
      req.userId,
    );
    res.status(200).json({
      message: "Contact us entry updated successfully",
      data: contactUs,
    });
  });

  deleteContactUs = asyncHandler(async (req: CustomRequest, res: Response) => {
    await this.contactUsService.deleteContactUs(
      this.getExternalId(req),
      req.userId,
    );
    res.status(200).json({
      message: "Contact us entry deleted successfully",
    });
  });

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid contact us ID", 400);
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
