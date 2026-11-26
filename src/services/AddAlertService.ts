import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateAddAlertDto,
  UpdateAddAlertDto,
} from "../domain/dto/AddAlertFormDto";
import { AddAlert } from "../domain/entities/mysql/AddAlert";
import { Client } from "../domain/entities/mysql/Client";
import { User } from "../domain/entities/mysql/User";
import {
  AddAlertType,
  includesAlertType,
} from "../domain/enums/AddAlertType";
import { Status } from "../domain/enums/status";
import { IAddAlertRepository } from "../domain/repositories/mysql/IAddAlertRepository";
import { AppError } from "../utils/errors";
import {
  AddAlertResponse,
  IAddAlertService,
} from "./interfaces/IAddAlertService";

@injectable()
export class AddAlertService implements IAddAlertService {
  constructor(
    @inject("IAddAlertRepository")
    private readonly addAlertRepository: IAddAlertRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getAddAlerts(): Promise<AddAlertResponse[]> {
    const alerts = await this.addAlertRepository.getAddAlerts();
    return alerts.map((alert) => this.toResponse(alert));
  }

  async getAddAlertById(externalId: string): Promise<AddAlertResponse> {
    const alert = await this.addAlertRepository.getAddAlertById(externalId);
    if (!alert) {
      throw new AppError("Add alert not found", 404);
    }
    return this.toResponse(alert);
  }

  async createAddAlert(
    payload: CreateAddAlertDto,
    actorUserId?: number,
  ): Promise<AddAlertResponse> {
    const addAlert = new AddAlert();
    addAlert.alertTypes = payload.alertTypes;
    this.applyDistanceFields(addAlert, payload.alertTypes, payload);
    addAlert.mobile = payload.mobile ?? false;
    addAlert.status = payload.status ?? Status.ACTIVE;
    addAlert.reason = payload.reason ?? null;
    addAlert.createdBy = await this.findActor(actorUserId);

    return this.toResponse(
      await this.addAlertRepository.createAddAlert(addAlert),
    );
  }

  async updateAddAlert(
    externalId: string,
    payload: UpdateAddAlertDto,
    actorUserId?: number,
  ): Promise<AddAlertResponse> {
    if (Object.keys(payload).length === 0) {
      throw new AppError(
        "At least one field is required to update an add alert",
        400,
      );
    }

    const existing =
      await this.addAlertRepository.getAddAlertById(externalId);
    if (!existing) {
      throw new AppError("Add alert not found", 404);
    }

    const actor = await this.findActor(actorUserId);
    if (actor) existing.updatedBy = actor;
    if (payload.alertTypes !== undefined) {
      existing.alertTypes = payload.alertTypes;
    }
    if (payload.mobile !== undefined) existing.mobile = payload.mobile;
    if (payload.status !== undefined) existing.status = payload.status;
    if (payload.reason !== undefined) existing.reason = payload.reason;

    const nextTypes = payload.alertTypes ?? existing.alertTypes;
    this.applyDistanceFields(existing, nextTypes, {
      overDriveDailyDistance:
        payload.overDriveDailyDistance !== undefined
          ? payload.overDriveDailyDistance
          : existing.overDriveDailyDistance,
      overDriveWeeklyDistance:
        payload.overDriveWeeklyDistance !== undefined
          ? payload.overDriveWeeklyDistance
          : existing.overDriveWeeklyDistance,
      underDriveDailyDistance:
        payload.underDriveDailyDistance !== undefined
          ? payload.underDriveDailyDistance
          : existing.underDriveDailyDistance,
      underDriveWeeklyDistance:
        payload.underDriveWeeklyDistance !== undefined
          ? payload.underDriveWeeklyDistance
          : existing.underDriveWeeklyDistance,
    });

    this.assertRequiredDistanceFields(nextTypes, existing);

    return this.toResponse(
      await this.addAlertRepository.updateAddAlert(existing),
    );
  }

  async deleteAddAlert(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.addAlertRepository.deleteAddAlert(externalId, actor);
  }

  private applyDistanceFields(
    alert: AddAlert,
    alertTypes: AddAlertType[],
    values: {
      overDriveDailyDistance?: number | null;
      overDriveWeeklyDistance?: number | null;
      underDriveDailyDistance?: number | null;
      underDriveWeeklyDistance?: number | null;
    },
  ): void {
    alert.overDriveDailyDistance = includesAlertType(
      alertTypes,
      AddAlertType.OVER_DRIVE_DAILY_DISTANCE,
    )
      ? (values.overDriveDailyDistance ?? null)
      : null;

    alert.overDriveWeeklyDistance = includesAlertType(
      alertTypes,
      AddAlertType.OVER_DRIVE_WEEKLY_DISTANCE,
    )
      ? (values.overDriveWeeklyDistance ?? null)
      : null;

    alert.underDriveDailyDistance = includesAlertType(
      alertTypes,
      AddAlertType.UNDER_DRIVE_DAILY_DISTANCE,
    )
      ? (values.underDriveDailyDistance ?? null)
      : null;

    alert.underDriveWeeklyDistance = includesAlertType(
      alertTypes,
      AddAlertType.UNDER_DRIVE_WEEKLY_DISTANCE,
    )
      ? (values.underDriveWeeklyDistance ?? null)
      : null;
  }

  private assertRequiredDistanceFields(
    alertTypes: AddAlertType[],
    alert: AddAlert,
  ): void {
    if (
      includesAlertType(alertTypes, AddAlertType.OVER_DRIVE_DAILY_DISTANCE) &&
      alert.overDriveDailyDistance == null
    ) {
      throw new AppError(
        "overDriveDailyDistance is required when Over Drive Daily Distance is selected",
        400,
      );
    }
    if (
      includesAlertType(alertTypes, AddAlertType.OVER_DRIVE_WEEKLY_DISTANCE) &&
      alert.overDriveWeeklyDistance == null
    ) {
      throw new AppError(
        "overDriveWeeklyDistance is required when Over Drive Weekly Distance is selected",
        400,
      );
    }
    if (
      includesAlertType(alertTypes, AddAlertType.UNDER_DRIVE_DAILY_DISTANCE) &&
      alert.underDriveDailyDistance == null
    ) {
      throw new AppError(
        "underDriveDailyDistance is required when Under Drive Daily Distance is selected",
        400,
      );
    }
    if (
      includesAlertType(
        alertTypes,
        AddAlertType.UNDER_DRIVE_WEEKLY_DISTANCE,
      ) &&
      alert.underDriveWeeklyDistance == null
    ) {
      throw new AppError(
        "underDriveWeeklyDistance is required when Under Drive Weekly Distance is selected",
        400,
      );
    }
  }

  private async findActor(userId?: number): Promise<Client | undefined> {
    if (userId === undefined) return undefined;
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new AppError("Invalid user ID", 401);
    }

    const em = this.em.fork();
    const authUser = await em.findOne(User, {
      id: userId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!authUser) {
      throw new AppError("User not found", 401);
    }

    return (
      (await em.findOne(Client, {
        externalId: authUser.externalId,
        isDeleted: false,
        status: Status.ACTIVE,
      })) ?? undefined
    );
  }

  private toResponse(alert: AddAlert): AddAlertResponse {
    return {
      id: alert.externalId,
      alertTypes: alert.alertTypes,
      overDriveDailyDistance: alert.overDriveDailyDistance ?? null,
      overDriveWeeklyDistance: alert.overDriveWeeklyDistance ?? null,
      underDriveDailyDistance: alert.underDriveDailyDistance ?? null,
      underDriveWeeklyDistance: alert.underDriveWeeklyDistance ?? null,
      mobile: alert.mobile,
      status: alert.status,
      reason: alert.reason ?? null,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }
}
