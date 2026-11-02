import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateCertificateAddDto,
  UpdateCertificateAddDto,
} from "../../../domain/dto/CertificateAddDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { ICertificateAddService } from "../../../services/interfaces/ICertificateAddService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

const imageFields = [
  "fitmentImage1",
  "fitmentImage2",
  "fitmentImage3",
  "fitmentImage4",
  "vendorLogo1",
  "vendorLogo2",
  "pancardLogo",
  "aadhaarFront",
  "aadhaarBack",
] as const;

@injectable()
export class CertificateAddController {
  constructor(
    @inject("ICertificateAddService")
    private readonly service: ICertificateAddService,
  ) {}

  getCertificateAdds = asyncHandler(async (_req: Request, res: Response) => {
    const certificates = await this.service.getCertificateAdds();
    res.status(200).json({
      message: "Certificate list fetched successfully",
      data: certificates,
    });
  });

  getCertificateAddById = asyncHandler(async (req: Request, res: Response) => {
    const certificate = await this.service.getCertificateAddById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Certificate fetched successfully",
      data: certificate,
    });
  });

  createCertificateAdd = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(
        CreateCertificateAddDto,
        this.getRequestBody(req),
      );
      await this.validateDto(dto);
      const certificate = await this.service.createCertificateAdd(
        dto,
        req.userId,
      );
      res.status(201).json({
        message: "Certificate created successfully",
        data: certificate,
      });
    },
  );

  updateCertificateAdd = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(
        UpdateCertificateAddDto,
        this.getRequestBody(req),
      );
      await this.validateDto(dto);
      const certificate = await this.service.updateCertificateAdd(
        this.getExternalId(req),
        dto,
        req.userId,
      );
      res.status(200).json({
        message: "Certificate updated successfully",
        data: certificate,
      });
    },
  );

  deleteCertificateAdd = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      await this.service.deleteCertificateAdd(
        this.getExternalId(req),
        req.userId,
      );
      res.status(200).json({
        message: "Certificate deleted successfully",
      });
    },
  );

  private getRequestBody(req: Request): Record<string, unknown> {
    const body: Record<string, unknown> = { ...req.body };
    const files = req.files;
    if (files && !Array.isArray(files)) {
      for (const field of imageFields) {
        const file = files[field]?.[0];
        if (file) body[field] = `/uploads/${file.filename}`;
      }
    }
    return body;
  }

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid certificate ID", 400);
    }
    return externalId.trim();
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
