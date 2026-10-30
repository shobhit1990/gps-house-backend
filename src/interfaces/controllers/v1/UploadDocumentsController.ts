import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  UpdateUploadDocumentDto,
  UploadDocumentDto,
} from "../../../domain/dto/UploadDocumentsDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { IUploadDocumentsService } from "../../../services/interfaces/IUploadDocumentsService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class UploadDocumentsController {
  constructor(
    @inject("IUploadDocumentsService")
    private readonly uploadDocumentsService: IUploadDocumentsService,
  ) {}

  getUploadDocuments = asyncHandler(async (_req: Request, res: Response) => {
    const documents = await this.uploadDocumentsService.getUploadDocuments();
    res.status(200).json({
      message: "Upload document list fetched successfully",
      data: documents,
    });
  });

  getUploadDocumentById = asyncHandler(async (req: Request, res: Response) => {
    const document = await this.uploadDocumentsService.getUploadDocumentById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Upload document fetched successfully",
      data: document,
    });
  });

  createUploadDocument = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const files = this.getFiles(req);
      const dto = plainToInstance(UploadDocumentDto, {
        ...req.body,
        uploadDocument: files.map((file) => `/uploads/${file.filename}`),
      });
      await this.validateDto(dto);
      const document = await this.uploadDocumentsService.createUploadDocument(
        dto,
        req.userId,
      );
      res.status(201).json({
        message: "Upload document created successfully",
        data: document,
      });
    },
  );

  updateUploadDocument = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const files = this.getFiles(req);
      const body: Record<string, unknown> = { ...req.body };
      if (files.length) {
        body.uploadDocument = files.map((file) => `/uploads/${file.filename}`);
      } else {
        delete body.uploadDocument;
      }

      const dto = plainToInstance(UpdateUploadDocumentDto, body);
      await this.validateDto(dto);
      const document = await this.uploadDocumentsService.updateUploadDocument(
        this.getExternalId(req),
        dto,
        req.userId,
      );
      res.status(200).json({
        message: "Upload document updated successfully",
        data: document,
      });
    },
  );

  deleteUploadDocument = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      await this.uploadDocumentsService.deleteUploadDocument(
        this.getExternalId(req),
        req.userId,
      );
      res.status(200).json({
        message: "Upload document deleted successfully",
      });
    },
  );

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid upload document ID", 400);
    }
    return externalId.trim();
  }

  private getFiles(req: Request): Express.Multer.File[] {
    const files = req.files;
    return Array.isArray(files) ? files : [];
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
