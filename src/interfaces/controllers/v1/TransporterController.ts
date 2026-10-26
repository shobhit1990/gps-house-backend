
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { plainToClass, plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ITransporterService } from "../../../services/interfaces/ITransporterService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { normalizeUserRequestBody } from "../../../utils/userMultipartBody";
import { CreateTransporterDto, updateTransporterDto } from "../../../domain/dto/TransporterDto";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";
import { InactiveTime } from "../../../domain/enums/InactiveTime";


@injectable()
export class TransporterController {
    constructor(
        @inject("ITransporterService")
        private readonly transporterService: ITransporterService,
    ) { }

    getTransporter = asyncHandler(async (req: CustomRequest, res: Response) => {
        const transporterList = await this.transporterService.getTransporter();

        res.status(200).json({
            data: transporterList,
            message: "Transporter list fetch successfully"
        })

    })

    getTransporterById = asyncHandler(async (req: Request, res: Response) => {
        const transporterId = Array.isArray(req.params.externalId)
            ? req.params.externalId[0]
            : req.params.externalId;

        if (!transporterId) {
            throw new AppError("Invalid transporter ID", 400);
        }

        const transporter = await this.transporterService.getTransporterById(transporterId);

        if (!transporter) {
            throw new AppError("Transporter not found", 404);
        }

        res.status(200).json({
            message: "Transporter fetched successfully",
            data: transporter,
        });
    });

    createTransporter = asyncHandler(async (req: CustomRequest, res: Response) => {
        const body = normalizeUserRequestBody(req);
        const dto = plainToClass(CreateTransporterDto, body, { enableImplicitConversion: true });
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


        await this.transporterService.createTransporter(dto, req.userId);

        res.status(201).json({
            message: "Transporter created successfully",
        });
    });


    updateTransporter = asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const transporterId = req.params.externalId;

            if (typeof transporterId !== "string" || !transporterId.trim()) {
                throw new AppError("Invalid Transporter ID", 400);
            }

            const body = normalizeUserRequestBody(req);

            const dto = plainToClass(
                updateTransporterDto,
                body,
                { enableImplicitConversion: true }
            );

            const validationErrors = await validate(dto, {
                whitelist: true,
            });

            if (validationErrors.length > 0) {
                const formattedErrors =
                    formatValidationErrors(validationErrors);

                throw new AppError(
                    "Validation failed. Please check the errors and try again.",
                    400,
                    null,
                    formattedErrors
                );
            }


            const updatedTransporter =
                await this.transporterService.updateTransporter(
                    transporterId,
                    dto
                );

            res.status(200).json({
                message: "Transporter updated successfully",
                data: {
                    id: updatedTransporter.externalId,
                    userName: updatedTransporter.userName,
                    companyName: updatedTransporter.companyName,
                    name: updatedTransporter.name,
                    email: updatedTransporter.email,
                    phone: updatedTransporter.phone,
                    address: updatedTransporter.address,
                    inactiveTime: updatedTransporter.inactiveTime,
                    subscriptionStartDate: updatedTransporter.subscriptionStartDate,
                    subscriptionDueDate: updatedTransporter.subscriptionDueDate,
                    subscriptionExtendDate: updatedTransporter.subscriptionExtendDate,
                    subscriptionExpiryCount: updatedTransporter.subscriptionExpiryCount,
                    maximumRadiusForNearestPOI: updatedTransporter.maximumRadiusForNearestPOI,
                    minimumDistanceForAddress: updatedTransporter.minimumDistanceForAddress,
                    dataRestriction: updatedTransporter.dataRestriction,
                    client: updatedTransporter.client,
                    status: updatedTransporter.status,
                    reason: updatedTransporter.reason,
                    updatedAt: updatedTransporter.updatedAt,
                },
            });
        }
    );

    deleteTransporter = asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const transporterId = req.params.externalId;

            if (typeof transporterId !== "string" || !transporterId.trim()) {
                throw new AppError("Invalid Transporter ID", 400);
            }

            await this.transporterService.deleteTransporter(transporterId);

            res.status(200).json({
                message: "Transporter deleted successfully",
            });
        }
    );
}
