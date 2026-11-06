import { inject, injectable } from "tsyringe";
import { IGeofTypeService } from "../../../services/interfaces/IGeofTypeService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { Request, Response } from "express";
import { AppError } from "../../../utils/errors";
import { formatValidationErrors, safeTransform } from "../../../utils/commonFunctions";
import { normalizeUserRequestBody } from "../../../utils/userMultipartBody";
import { plainToClass } from "class-transformer";
import { CreatGeofTypeDto, UpdateGeofTypeDto } from "../../../domain/dto/GeofTypeDto";
import { validate } from "class-validator";

@injectable()
export class GeofTypeController {
    constructor(
        @inject("IGeofTypeService")
        private readonly geofTypeService: IGeofTypeService
    ) { }

    getGeofType = asyncHandler(async (req: CustomRequest, res: Response) => {
        const typeList = await this.geofTypeService.getGeofType();
        res.status(200).json({
            data: typeList,
            message: "Geof list fetch successfully"
        })

    })

    getGeofTypeById = asyncHandler(async (req: Request, res: Response) => {
        const externalId = (req.params.externalId);

        if (typeof externalId !== "string") {
            throw new AppError("Invalid externalId", 400);
        }

        const type = await this.geofTypeService.getGeofTypeById(externalId);

        if (!type) {
            throw new AppError("Geof not found", 404);
        }

        res.status(200).json({
            message: "Role fetched successfully",
            data: safeTransform(type),
        });
    });

    createGeofType = asyncHandler(async (req: CustomRequest, res: Response) => {
        const body = normalizeUserRequestBody(req);
        const dto = plainToClass(CreatGeofTypeDto, body);
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
        await this.geofTypeService.createGeofType(dto, req.ExternalId);

        res.status(201).json({
            message: "GeofType created successfully",
        });
    });

    updateGeofType = asyncHandler(async (req: CustomRequest, res: Response) => {
        const externalId = (req.params.externalId);

        // Validate user ID
        if (typeof externalId !== "string" || !externalId) {
            throw new AppError("Invalid external ID", 400);
        }

        const body = normalizeUserRequestBody(req);
        const dto = plainToClass(UpdateGeofTypeDto, body);
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
        await this.geofTypeService.updateGeofType(externalId, dto);

        res.status(200).json({
            message: "Geof Type updated successfully",
        });
    });

    deleteGeofType = asyncHandler(async (req: CustomRequest, res: Response) => {
        const externalId = (req.params.externalId);

        if (typeof externalId !== "string" || !externalId) {
            throw new AppError("Invalid external ID", 400);
        }

        await this.geofTypeService.deleteGeofType(externalId);

        res.status(200).json({
            message: "GeofType deleted successfully",
        });
    });

}