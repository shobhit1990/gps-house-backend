import { inject, injectable } from "tsyringe";
import { Request, Response } from "express";
import { IOwnerService } from "../../../services/interfaces/IOwnerService";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { asyncHandler } from "../../../utils/asyncHandler";
import { AppError } from "../../../utils/errors";
import { formatValidationErrors, safeTransform } from "../../../utils/commonFunctions";
import { normalizeUserRequestBody } from "../../../utils/userMultipartBody";
import { plainToClass } from "class-transformer";
import { CreateOwnerDto, UpdateOwnerDto } from "../../../domain/dto/OwnerDto";
import { validate } from "class-validator";

@injectable()
export class OwnerController {
  constructor(
    @inject("IOwnerService")
    private readonly ownerService: IOwnerService
  ) { }

  getOwner = asyncHandler(async (req: CustomRequest, res: Response) => {
    const ownerList = await this.ownerService.getOwner();
    res.status(200).json({
      data: ownerList,
      message: "Owner list fetch successfully"
    })

  })

  getOwnerById = asyncHandler(async (req: Request, res: Response) => {
    const ownerId = (req.params.externalId);

    if (typeof ownerId !== "string") {
    throw new AppError("Invalid owner ID", 400);
}

    const owner = await this.ownerService.getOwnerById(ownerId);

    if (!owner) {
      throw new AppError("Owner not found", 404);
    }

    res.status(200).json({
      message: "Role fetched successfully",
      data: safeTransform(owner),
    });
  });

   createOwner = asyncHandler(async (req: CustomRequest, res: Response) => {
    const body = normalizeUserRequestBody(req);
    const dto = plainToClass(CreateOwnerDto, body, { enableImplicitConversion: true });
    const validationErrors = await validate(dto, { whitelist: true });

    if (validationErrors.length > 0) {
      const formattedErrors = formatValidationErrors(validationErrors);
      throw new AppError(
        "Validation failed. Please check the errors and try again.",
        400,
        null,
        formattedErrors
      );
    }
    // const photoFile = extractUserPhotoFile(req);
    await this.ownerService.createOwner(dto, req.ExternalId);

    res.status(201).json({
      message: "Role created successfully",
    });
  });

   updateOwner = asyncHandler(async (req: CustomRequest, res: Response) => {
    const ownerId = (req.params.externalId);

    // Validate user ID
    if (typeof ownerId !== "string" || !ownerId) {
    throw new AppError("Invalid owner ID", 400);
}

    const body = normalizeUserRequestBody(req);
    const dto = plainToClass(UpdateOwnerDto, body, { enableImplicitConversion: true });
    const validationErrors = await validate(dto, { whitelist: true });

    if (validationErrors.length > 0) {
      const formattedErrors = formatValidationErrors(validationErrors);
      throw new AppError(
        "Validation failed. Please check the errors and try again.",
        400,
        null,
        formattedErrors
      );
    }
    await this.ownerService.updateOwner(ownerId, dto);

    res.status(200).json({
      message: "Owner updated successfully",
    });
  });

    deleteOwner = asyncHandler(async (req: CustomRequest, res: Response) => {
    const ownerId = (req.params.externalId);

       if (typeof ownerId !== "string" || !ownerId) {
    throw new AppError("Invalid owner ID", 400);
}

    await this.ownerService.deleteOwner(ownerId);

    res.status(200).json({
      message: "Owner deleted successfully",
    });
  });
}