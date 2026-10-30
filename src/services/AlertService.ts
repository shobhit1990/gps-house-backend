import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import { CreateAlertDto, UpdateAlertDto } from "../domain/dto/AddAlertDto";
import { AddGroup } from "../domain/entities/mysql/AddGroup";
import { AddVehicle } from "../domain/entities/mysql/AddVehicle";
import { AlertType } from "../domain/entities/mysql/AlertType";
import { Client } from "../domain/entities/mysql/Client";
import { Transporter } from "../domain/entities/mysql/Transporter";
import { User } from "../domain/entities/mysql/User";
import { AlertAssignType } from "../domain/enums/AlertAssignType";
import { Status } from "../domain/enums/status";
import { IAlertService } from "./interfaces/IAlertService";
import { IAlertRepository } from "../domain/repositories/mysql/IAlertRepository";
import { AppError } from "../utils/errors";
import { Alert } from "../domain/entities/mysql/Alert";

@injectable()
export class AlertService implements IAlertService {
  constructor(
    @inject("IAlertRepository")
    private readonly alertRepository: IAlertRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getAlert(): Promise<{ id: string; alertName: string }[]> {
    const alertTypes = await this.alertRepository.getAlert();

    return alertTypes.map((alertType) => ({
      id: alertType.externalId,
      alertName: alertType.alertName,
    }));
  }

  async getAlerts() {
    const alerts = await this.alertRepository.getAlerts();
    return alerts.map((alert) => this.toResponse(alert));
  }

  async getAlertById(externalId: string) {
    const alert = await this.alertRepository.getAlertById(externalId);
    if (!alert) {
      throw new AppError("Alert not found", 404);
    }
    return this.toResponse(alert);
  }

  async createAlert(payload: CreateAlertDto, actorUserId?: number) {
    const em = this.em.fork();
    const actor = await this.findActor(em, actorUserId);

    const alertAssignedTo = payload.alertAssignedTo;
    if (!alertAssignedTo) {
      throw new AppError("alertAssignedTo is required", 400);
    }
    const assignedToId = this.getPayloadAssignedTargetId(
      payload,
      alertAssignedTo,
    );
    if (!assignedToId) {
      throw new AppError(
        `${alertAssignedTo} is required for the selected alert assignment`,
        400,
      );
    }
    const vehicleIds = [
      ...new Set([
        ...(payload.vehicleIds ?? []),
        ...(payload.vehicle ? [payload.vehicle] : []),
      ]),
    ];
    if (vehicleIds.length === 0) {
      throw new AppError("vehicle or vehicleIds is required", 400);
    }
    const alertTypeIds = [
      ...new Set([
        ...(payload.alertTypeIds ?? []),
        ...(payload.alertType ? [payload.alertType] : []),
      ]),
    ];
    if (alertTypeIds.length === 0) {
      throw new AppError("alertType or alertTypeIds is required", 400);
    }

    const assignedTo = await this.findAssignedTarget(em, {
      alertAssignedTo,
      assignedToId,
    });
    const vehicles = await em.find(AddVehicle, {
      externalId: { $in: vehicleIds },
      isDeleted: false,
    });
    if (
      vehicles.length !== vehicleIds.length ||
      vehicles.some(
        (vehicle) =>
          vehicle.status !== undefined && vehicle.status !== Status.ACTIVE,
      )
    ) {
      throw new AppError("One or more vehicles are invalid or inactive", 400);
    }

    if (
      alertAssignedTo === AlertAssignType.TRANSPORTER &&
      vehicles.some((vehicle) => vehicle.transporter.id !== assignedTo.id)
    ) {
      throw new AppError(
        "Selected vehicles must belong to the selected transporter",
        400,
      );
    }

    const alertTypes = await em.find(AlertType, {
      externalId: { $in: alertTypeIds },
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (alertTypes.length !== alertTypeIds.length) {
      throw new AppError(
        "One or more alert types are invalid or inactive",
        400,
      );
    }

    const records = vehicles.flatMap((vehicle) =>
      alertTypes.map((alertType) => ({
        alertName: payload.alertName,
        alertAssignedTo,
        assignedToId: assignedTo.id,
        vehicleId: vehicle.id,
        alertTypeId: alertType.id,
        mobile: payload.mobile ?? false,
        status: payload.status ?? Status.ACTIVE,
        reason: payload.reason,
        createdById: actor?.id,
      })),
    );

    const alerts = await this.alertRepository.createAlerts(records);
    return alerts.map((alert) => this.toResponse(alert));
  }

  async updateAlert(
    externalId: string,
    payload: UpdateAlertDto,
    actorUserId?: number,
  ) {
    if (Object.keys(payload).length === 0) {
      throw new AppError(
        "At least one field is required to update an alert",
        400,
      );
    }

    const em = this.em.fork();
    const existing = await this.alertRepository.getAlertById(externalId);
    if (!existing) {
      throw new AppError("Alert not found", 404);
    }
    if (
      payload.alertAssignedTo !== undefined &&
      payload.alertAssignedTo !== existing.alertAssignedTo &&
      payload.assignedToId === undefined
    ) {
      throw new AppError(
        "assignedToId is required when changing alertAssignedTo",
        400,
      );
    }

    const alertAssignedTo = payload.alertAssignedTo ?? existing.alertAssignedTo;
    const requestedAssignedToId = this.getPayloadAssignedTargetId(
      payload,
      alertAssignedTo,
    );
    if (
      alertAssignedTo !== existing.alertAssignedTo &&
      requestedAssignedToId === undefined
    ) {
      throw new AppError(
        `${alertAssignedTo} is required when changing alertAssignedTo`,
        400,
      );
    }
    const assignedToId =
      requestedAssignedToId ?? this.getAssignedTargetId(existing);
    const vehicleExternalId =
      payload.vehicleId ?? payload.vehicle ?? existing.vehicle.externalId;
    const alertTypeExternalId =
      payload.alertTypeId ?? payload.alertType ?? existing.alertType.externalId;

    const assignedTo = await this.findAssignedTarget(em, {
      alertAssignedTo,
      assignedToId,
    });
    const vehicle = await em.findOne(AddVehicle, {
      externalId: vehicleExternalId,
      isDeleted: false,
    });
    if (
      !vehicle ||
      (vehicle.status !== undefined && vehicle.status !== Status.ACTIVE)
    ) {
      throw new AppError("Selected vehicle was not found or is inactive", 400);
    }
    if (
      alertAssignedTo === AlertAssignType.TRANSPORTER &&
      vehicle.transporter.id !== assignedTo.id
    ) {
      throw new AppError(
        "Selected vehicle must belong to the selected transporter",
        400,
      );
    }

    const alertType = await em.findOne(AlertType, {
      externalId: alertTypeExternalId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!alertType) {
      throw new AppError(
        "Selected alert type was not found or is inactive",
        400,
      );
    }

    const actor = await this.findActor(em, actorUserId);
    const alert = await this.alertRepository.updateAlert(externalId, {
      alertName: payload.alertName ?? existing.alertName,
      alertAssignedTo,
      assignedToId: assignedTo.id,
      vehicleId: vehicle.id,
      alertTypeId: alertType.id,
      mobile: payload.mobile ?? existing.mobile,
      status: payload.status ?? existing.status,
      reason: payload.reason !== undefined ? payload.reason : existing.reason,
      updatedById: actor?.id,
    });
    return this.toResponse(alert);
  }

  async deleteAlert(externalId: string, actorUserId?: number): Promise<void> {
    const em = this.em.fork();
    const existing = await this.alertRepository.getAlertById(externalId);
    if (!existing) {
      throw new AppError("Alert not found", 404);
    }
    const actor = await this.findActor(em, actorUserId);
    await this.alertRepository.deleteAlert(externalId, actor?.id);
  }

  private async findActor(
    em: EntityManager,
    actorUserId?: number,
  ): Promise<Client | undefined> {
    if (actorUserId === undefined) {
      return undefined;
    }
    if (!Number.isSafeInteger(actorUserId) || actorUserId <= 0) {
      throw new AppError("Invalid user ID", 401);
    }
    const actor = await em.findOne(Client, {
      id: actorUserId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!actor) {
      throw new AppError("User not found", 401);
    }
    return actor;
  }

  private getAssignedTargetId(alert: Alert): string {
    switch (alert.alertAssignedTo) {
      case AlertAssignType.TRANSPORTER:
        if (alert.transporter) return alert.transporter.externalId;
        break;
      case AlertAssignType.USER:
        if (alert.user) return alert.user.externalId;
        break;
      case AlertAssignType.GROUP:
        if (alert.group) return alert.group.externalId;
        break;
    }
    throw new AppError("Alert assignment relationship is missing", 500);
  }

  private getPayloadAssignedTargetId(
    payload: Partial<
      Pick<CreateAlertDto, "assignedToId" | "transporter" | "user" | "group">
    >,
    alertAssignedTo: AlertAssignType,
  ): string | undefined {
    const targetIds = {
      [AlertAssignType.TRANSPORTER]: payload.transporter,
      [AlertAssignType.USER]: payload.user,
      [AlertAssignType.GROUP]: payload.group,
    };
    const selectedTargetId = targetIds[alertAssignedTo];
    const otherTargetId = Object.entries(targetIds).find(
      ([type, id]) => type !== alertAssignedTo && id !== undefined,
    );
    if (otherTargetId) {
      throw new AppError(
        `${otherTargetId[0]} cannot be provided for ${alertAssignedTo} assignment`,
        400,
      );
    }
    if (
      payload.assignedToId !== undefined &&
      selectedTargetId !== undefined &&
      payload.assignedToId !== selectedTargetId
    ) {
      throw new AppError(
        "assignedToId must match the selected assignment ID",
        400,
      );
    }
    return selectedTargetId ?? payload.assignedToId;
  }

  private async findAssignedTarget(
    em: EntityManager,
    payload: { alertAssignedTo: AlertAssignType; assignedToId: string },
  ): Promise<Transporter | User | AddGroup> {
    switch (payload.alertAssignedTo) {
      case AlertAssignType.TRANSPORTER: {
        const transporter = await em.findOne(Transporter, {
          externalId: payload.assignedToId,
          isDeleted: false,
          status: Status.ACTIVE,
        });
        if (!transporter) {
          throw new AppError(
            "Selected transporter was not found or is inactive",
            400,
          );
        }
        return transporter;
      }
      case AlertAssignType.USER: {
        const user = await em.findOne(User, {
          externalId: payload.assignedToId,
          isDeleted: false,
          status: Status.ACTIVE,
        });
        if (!user) {
          throw new AppError("Selected user was not found or is inactive", 400);
        }
        return user;
      }
      case AlertAssignType.GROUP: {
        const group = await em.findOne(AddGroup, {
          externalId: payload.assignedToId,
          isDeleted: false,
        });
        if (!group || (group.status && group.status !== Status.ACTIVE)) {
          throw new AppError(
            "Selected group was not found or is inactive",
            400,
          );
        }
        return group;
      }
    }
    throw new AppError("Invalid alert assignment type", 400);
  }

  private toResponse(alert: Alert) {
    let assignedTo: { id: string; name: string };
    switch (alert.alertAssignedTo) {
      case AlertAssignType.TRANSPORTER:
        if (!alert.transporter) {
          throw new AppError("Alert transporter relationship is missing", 500);
        }
        assignedTo = {
          id: alert.transporter!.externalId,
          name: alert.transporter!.name ?? alert.transporter!.companyName,
        };
        break;
      case AlertAssignType.USER:
        if (!alert.user) {
          throw new AppError("Alert user relationship is missing", 500);
        }
        assignedTo = {
          id: alert.user!.externalId,
          name: alert.user!.userName,
        };
        break;
      case AlertAssignType.GROUP:
        if (!alert.group) {
          throw new AppError("Alert group relationship is missing", 500);
        }
        assignedTo = {
          id: alert.group!.externalId,
          name: alert.group!.groupName,
        };
        break;
    }

    return {
      id: alert.externalId,
      alertName: alert.alertName,
      alertAssignedTo: alert.alertAssignedTo,
      assignedTo,
      vehicle: {
        id: alert.vehicle.externalId,
        vehicle: alert.vehicle.vehicle,
      },
      alertType: {
        id: alert.alertType.externalId,
        alertName: alert.alertType.alertName,
      },
      mobile: alert.mobile,
      status: alert.status,
      reason: alert.reason ?? null,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }
}
