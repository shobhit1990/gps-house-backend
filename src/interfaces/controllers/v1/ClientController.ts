import { inject, injectable } from "tsyringe";
import { IClientService } from "../../../services/interfaces/IClientService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { normalizeUserRequestBody } from "../../../utils/userMultipartBody";
import { plainToClass } from "class-transformer";
import { CreateClientDto, UpdateClientDto } from "../../../domain/dto/ClientDto";
import { validate } from "class-validator";
import { AppError } from "../../../utils/errors";
import { Request, Response } from "express";
import { formatValidationErrors } from "../../../utils/commonFunctions";

@injectable()
export class ClientController {
    constructor(
        @inject("IClientService")
        private readonly clientService: IClientService
    ) { }

    getClient = asyncHandler(async (req: CustomRequest, res: Response) => {
        const clientList = await this.clientService.getClient();

        res.status(200).json({
            data: clientList,
            message: "Client list fetch successfully"
        })

    })

    getClientById = asyncHandler(async (req: Request, res: Response) => {
        const clientId = Array.isArray(req.params.externalId)
            ? req.params.externalId[0]
            : req.params.externalId;

        if (!clientId) {
            throw new AppError("Invalid client ID", 400);
        }

        const client = await this.clientService.getClientById(clientId);

        if (!client) {
            throw new AppError("client not found", 404);
        }

        res.status(200).json({
            message: "Client fetched successfully",
            data: client,
        });
    });

    createClient = asyncHandler(async (req: CustomRequest, res: Response) => {
        const body = normalizeUserRequestBody(req);
        const dto = plainToClass(CreateClientDto, body, { enableImplicitConversion: true });
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

        if (req.file) {
            dto.clientImage = `/uploads/${req.file.filename}`;
        }

        await this.clientService.createClient(dto, req.userId);

        res.status(201).json({
            message: "Client created successfully",
        });
    });

    updateClient = asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const clientId = req.params.externalId;

            if (typeof clientId !== "string" || !clientId.trim()) {
                throw new AppError("Invalid client ID", 400);
            }

            const body = normalizeUserRequestBody(req);

            const dto = plainToClass(
                UpdateClientDto,
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

            if (req.file) {
                dto.clientImage = `/uploads/${req.file.filename}`;
            }

            const updatedClient =
                await this.clientService.updateClient(
                    clientId,
                    dto
                );

            res.status(200).json({
                message: "Client updated successfully",
                data: {
                    id: updatedClient.externalId,
                    userName: updatedClient.userName,
                    companyName: updatedClient.companyName,
                    name: updatedClient.name,
                    email: updatedClient.email,
                    phone: updatedClient.phone,
                    address: updatedClient.address,
                    domain: updatedClient.domain,
                    vehicle_count: updatedClient.vehicle_count,
                    clientImage: updatedClient.clientImage,
                    status: updatedClient.status,
                    reason: updatedClient.reason,
                    updatedAt: updatedClient.updatedAt,
                },
            });
        }
    );

    deleteClient = asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const clientId = req.params.externalId;

            if (typeof clientId !== "string" || !clientId.trim()) {
                throw new AppError("Invalid client ID", 400);
            }

            await this.clientService.deleteClient(clientId);

            res.status(200).json({
                message: "Client deleted successfully",
            });
        }
    );

}