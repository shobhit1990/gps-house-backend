import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateRaiseTicketDto,
  UpdateRaiseTicketDto,
} from "../../../domain/dto/RaiseTicketDto";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import { IRaiseTicketService } from "../../../services/interfaces/IRaiseTicketService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class RaiseTicketController {
  constructor(
    @inject("IRaiseTicketService")
    private readonly service: IRaiseTicketService,
  ) {}

  getRaiseTickets = asyncHandler(async (_req: Request, res: Response) => {
    const tickets = await this.service.getRaiseTickets();
    res.status(200).json({
      message: "Raise ticket list fetched successfully",
      data: tickets,
    });
  });

  getRaiseTicketById = asyncHandler(async (req: Request, res: Response) => {
    const ticket = await this.service.getRaiseTicketById(
      this.getExternalId(req),
    );
    res.status(200).json({
      message: "Raise ticket fetched successfully",
      data: ticket,
    });
  });

  createRaiseTicket = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(CreateRaiseTicketDto, req.body);
      await this.validateDto(dto);
      const ticket = await this.service.createRaiseTicket(dto, req.userId);
      res.status(201).json({
        message: "Raise ticket created successfully",
        data: ticket,
      });
    },
  );

  updateRaiseTicket = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      const dto = plainToInstance(UpdateRaiseTicketDto, req.body);
      await this.validateDto(dto);
      const ticket = await this.service.updateRaiseTicket(
        this.getExternalId(req),
        dto,
        req.userId,
      );
      res.status(200).json({
        message: "Raise ticket updated successfully",
        data: ticket,
      });
    },
  );

  deleteRaiseTicket = asyncHandler(
    async (req: CustomRequest, res: Response) => {
      await this.service.deleteRaiseTicket(this.getExternalId(req), req.userId);
      res.status(200).json({ message: "Raise ticket deleted successfully" });
    },
  );

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid raise ticket ID", 400);
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
