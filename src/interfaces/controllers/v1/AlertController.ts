import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  CreateAlertDto,
  UpdateAlertDto,
} from "../../../domain/dto/AddAlertDto";
import { NotificationType } from "../../../domain/enums/NotificationType";
import { CustomRequest } from "../../../domain/models/CustomRequest";
import {
  AlertListFilter,
  IAlertService,
} from "../../../services/interfaces/IAlertService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { formatValidationErrors } from "../../../utils/commonFunctions";
import { AppError } from "../../../utils/errors";

@injectable()
export class AlertController {
  constructor(
    @inject("IAlertService")
    private readonly alertService: IAlertService,
  ) {}

  getAlerts = asyncHandler(async (req: Request, res: Response) => {
    const filter = this.parseListFilter(req);
    const alerts = await this.alertService.getAlerts(filter);
    res.status(200).json({
      message: "Alert list fetched successfully",
      filter: {
        client: filter.clientExternalId ?? null,
        transporter: filter.transporterExternalId ?? null,
        vehicle: filter.vehicleExternalId ?? null,
        notification: filter.notification ?? null,
      },
      data: alerts,
    });
  });

  getAlertById = asyncHandler(async (req: Request, res: Response) => {
    const alert = await this.alertService.getAlertById(this.getExternalId(req));
    res.status(200).json({
      message: "Alert fetched successfully",
      data: alert,
    });
  });

  createAlert = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(CreateAlertDto, req.body);
    await this.validateDto(dto);
    const alerts = await this.alertService.createAlert(dto, req.userId);

    res.status(201).json({
      message: "Alert created successfully",
      data: alerts,
    });
  });

  updateAlert = asyncHandler(async (req: CustomRequest, res: Response) => {
    const dto = plainToInstance(UpdateAlertDto, req.body);
    await this.validateDto(dto);
    const alert = await this.alertService.updateAlert(
      this.getExternalId(req),
      dto,
      req.userId,
    );
    res.status(200).json({
      message: "Alert updated successfully",
      data: alert,
    });
  });

  deleteAlert = asyncHandler(async (req: CustomRequest, res: Response) => {
    await this.alertService.deleteAlert(this.getExternalId(req), req.userId);
    res.status(200).json({
      message: "Alert deleted successfully",
    });
  });

  private getExternalId(req: Request): string {
    const param = req.params.externalId;
    const externalId = Array.isArray(param) ? param[0] : param;
    if (typeof externalId !== "string" || !externalId.trim()) {
      throw new AppError("Invalid alert ID", 400);
    }
    return externalId;
  }

  private parseListFilter(req: Request): AlertListFilter {
    const notificationRaw = this.parseOptionalQueryString(
      req.query.notification ?? req.query.notificationType,
      "notification",
    );
    let notification: NotificationType | undefined;
    if (notificationRaw) {
      const values = Object.values(NotificationType) as string[];
      if (!values.includes(notificationRaw)) {
        throw new AppError(
          `Invalid notification. Use NotificationType enum values: ${values.join(", ")}`,
          400,
        );
      }
      notification = notificationRaw as NotificationType;
    }

    return {
      clientExternalId: this.parseOptionalQueryString(
        req.query.client,
        "client",
      ),
      transporterExternalId: this.parseOptionalQueryString(
        req.query.transporter,
        "transporter",
      ),
      vehicleExternalId: this.parseOptionalQueryString(
        req.query.vehicle,
        "vehicle",
      ),
      notification,
    };
  }

  private parseOptionalQueryString(
    value: unknown,
    fieldName: string,
  ): string | undefined {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    const raw = Array.isArray(value) ? value[0] : value;
    if (typeof raw !== "string" || !raw.trim()) {
      throw new AppError(`Invalid ${fieldName}`, 400);
    }
    return raw.trim();
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
