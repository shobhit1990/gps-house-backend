import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateCustomAlertDto,
  UpdateCustomAlertDto,
} from "../domain/dto/CustomAlertDto";
import { Client } from "../domain/entities/mysql/Client";
import { CustomAlert } from "../domain/entities/mysql/CustomAlert";
import { SensorMaster } from "../domain/entities/mysql/SensorMaster";
import { User } from "../domain/entities/mysql/User";
import { Status } from "../domain/enums/status";
import { ICustomAlertRepository } from "../domain/repositories/mysql/ICustomAlertRepository";
import { AppError } from "../utils/errors";
import {
  CustomAlertResponse,
  ICustomAlertService,
} from "./interfaces/ICustomAlertService";

@injectable()
export class CustomAlertService implements ICustomAlertService {
  constructor(
    @inject("ICustomAlertRepository")
    private readonly customAlertRepository: ICustomAlertRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getCustomAlerts(): Promise<CustomAlertResponse[]> {
    const alerts = await this.customAlertRepository.getCustomAlerts();
    return alerts.map((alert) => this.toResponse(alert));
  }

  async getCustomAlertById(externalId: string): Promise<CustomAlertResponse> {
    const alert =
      await this.customAlertRepository.getCustomAlertById(externalId);
    if (!alert) {
      throw new AppError("Custom alert not found", 404);
    }
    return this.toResponse(alert);
  }

  async createCustomAlert(
    payload: CreateCustomAlertDto,
    actorUserId?: number,
  ): Promise<CustomAlertResponse> {
    const em = this.em.fork();
    const sensor = payload.sensor
      ? await this.findActiveSensor(em, payload.sensor)
      : null;
    const actor = await this.findActor(actorUserId);

    const enableGeofence = payload.enableGeofenceRestrictions ?? false;
    const enableTrip = payload.enableTripRestrictions ?? false;

    if (enableGeofence && !payload.geofenceSelectType) {
      throw new AppError(
        "geofenceSelectType is required when geofence restrictions are enabled",
        400,
      );
    }
    if (enableTrip && !payload.tripSelectType) {
      throw new AppError(
        "tripSelectType is required when trip restrictions are enabled",
        400,
      );
    }

    const customAlert = new CustomAlert();
    customAlert.alertName = payload.alertName;
    customAlert.sensor = sensor;
    customAlert.operation = payload.operation;
    customAlert.value = payload.value;
    customAlert.enableGeofenceRestrictions = enableGeofence;
    customAlert.geofenceSelectType = enableGeofence
      ? (payload.geofenceSelectType ?? null)
      : null;
    customAlert.enableTripRestrictions = enableTrip;
    customAlert.tripSelectType = enableTrip
      ? (payload.tripSelectType ?? null)
      : null;
    customAlert.subject = payload.subject;
    customAlert.messageBody = payload.messageBody;
    customAlert.mobile = payload.mobile ?? false;
    customAlert.status = payload.status ?? Status.ACTIVE;
    customAlert.reason = payload.reason ?? null;
    customAlert.createdBy = actor;

    return this.toResponse(
      await this.customAlertRepository.createCustomAlert(customAlert),
    );
  }

  async updateCustomAlert(
    externalId: string,
    payload: UpdateCustomAlertDto,
    actorUserId?: number,
  ): Promise<CustomAlertResponse> {
    if (Object.keys(payload).length === 0) {
      throw new AppError(
        "At least one field is required to update a custom alert",
        400,
      );
    }

    const existing =
      await this.customAlertRepository.getCustomAlertById(externalId);
    if (!existing) {
      throw new AppError("Custom alert not found", 404);
    }

    const em = this.em.fork();
    const actor = await this.findActor(actorUserId);

    if (payload.sensor !== undefined) {
      existing.sensor = payload.sensor
        ? await this.findActiveSensor(em, payload.sensor)
        : null;
    }
    if (payload.alertName !== undefined) existing.alertName = payload.alertName;
    if (payload.operation !== undefined) existing.operation = payload.operation;
    if (payload.value !== undefined) existing.value = payload.value;
    if (payload.subject !== undefined) existing.subject = payload.subject;
    if (payload.messageBody !== undefined) {
      existing.messageBody = payload.messageBody;
    }
    if (payload.mobile !== undefined) existing.mobile = payload.mobile;
    if (payload.status !== undefined) existing.status = payload.status;
    if (payload.reason !== undefined) existing.reason = payload.reason;

    const enableGeofence =
      payload.enableGeofenceRestrictions ?? existing.enableGeofenceRestrictions;
    const enableTrip =
      payload.enableTripRestrictions ?? existing.enableTripRestrictions;

    existing.enableGeofenceRestrictions = enableGeofence;
    if (!enableGeofence) {
      existing.geofenceSelectType = null;
    } else if (payload.geofenceSelectType !== undefined) {
      existing.geofenceSelectType = payload.geofenceSelectType;
    } else if (!existing.geofenceSelectType) {
      throw new AppError(
        "geofenceSelectType is required when geofence restrictions are enabled",
        400,
      );
    }

    existing.enableTripRestrictions = enableTrip;
    if (!enableTrip) {
      existing.tripSelectType = null;
    } else if (payload.tripSelectType !== undefined) {
      existing.tripSelectType = payload.tripSelectType;
    } else if (!existing.tripSelectType) {
      throw new AppError(
        "tripSelectType is required when trip restrictions are enabled",
        400,
      );
    }

    if (actor) existing.updatedBy = actor;

    return this.toResponse(
      await this.customAlertRepository.updateCustomAlert(existing),
    );
  }

  async deleteCustomAlert(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.customAlertRepository.deleteCustomAlert(externalId, actor);
  }

  private async findActiveSensor(
    em: EntityManager,
    sensorId: string,
  ): Promise<SensorMaster> {
    const sensor = await em.findOne(SensorMaster, {
      externalId: sensorId,
      isDeleted: false,
    });
    if (!sensor) {
      throw new AppError("Sensor master not found", 404);
    }
    if (sensor.status !== undefined && sensor.status !== Status.ACTIVE) {
      throw new AppError("Sensor master is inactive", 400);
    }
    return sensor;
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

  private toResponse(alert: CustomAlert): CustomAlertResponse {
    return {
      id: alert.externalId,
      alertName: alert.alertName,
      sensor: alert.sensor
        ? {
            id: alert.sensor.externalId,
            sensorName: alert.sensor.sensorName,
          }
        : null,
      operation: alert.operation,
      value: alert.value,
      enableGeofenceRestrictions: alert.enableGeofenceRestrictions,
      geofenceSelectType: alert.geofenceSelectType ?? null,
      enableTripRestrictions: alert.enableTripRestrictions,
      tripSelectType: alert.tripSelectType ?? null,
      subject: alert.subject,
      messageBody: alert.messageBody,
      mobile: alert.mobile,
      status: alert.status,
      reason: alert.reason ?? null,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }
}
