import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { inject, injectable } from "tsyringe";
import {
    CreateAddVehicleDto,
    UpdateAddVehicleDto,
} from "../../../domain/dto/AddVehicleDto";
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

    getAddVehicle = asyncHandler(async (_req: Request, res: Response) => {
        const vehicles = await this.vehicleService.getAddVehicle();
        res.status(200).json({
            message: "Vehicle list fetched successfully",
            data: vehicles,
        });
    });

    getAddVehicleById = asyncHandler(async (req: Request, res: Response) => {
        const externalId = this.getExternalId(req);
        const vehicle = await this.vehicleService.getAddVehicleById(externalId);
        res.status(200).json({
            message: "Vehicle fetched successfully",
            data: vehicle,
        });
    });

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

    private async validateDto(dto: object): Promise<void> {
        const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
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