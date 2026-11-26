import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { CustomAlert } from "../../../../domain/entities/mysql/CustomAlert";
import { Client } from "../../../../domain/entities/mysql/Client";
import { SensorMaster } from "../../../../domain/entities/mysql/SensorMaster";
import { ICustomAlertRepository } from "../../../../domain/repositories/mysql/ICustomAlertRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class CustomAlertRepository implements ICustomAlertRepository {
  constructor(private readonly em: EntityManager) {}

  async getCustomAlerts(): Promise<CustomAlert[]> {
    return this.em.fork().find(
      CustomAlert,
      { isDeleted: false },
      { populate: ["sensor"] },
    );
  }

  async getCustomAlertById(externalId: string): Promise<CustomAlert | null> {
    return this.em.fork().findOne(
      CustomAlert,
      { externalId, isDeleted: false },
      { populate: ["sensor"] },
    );
  }

  async createCustomAlert(customAlert: CustomAlert): Promise<CustomAlert> {
    const em = this.em.fork();
    customAlert.sensor = customAlert.sensor
      ? em.getReference(SensorMaster, customAlert.sensor.id)
      : null;
    if (customAlert.createdBy) {
      customAlert.createdBy = em.getReference(Client, customAlert.createdBy.id);
    }
    await em.persistAndFlush(customAlert);
    await em.populate(customAlert, ["sensor"]);
    return customAlert;
  }

  async updateCustomAlert(customAlert: CustomAlert): Promise<CustomAlert> {
    const em = this.em.fork();
    const existing = await em.findOne(
      CustomAlert,
      { externalId: customAlert.externalId, isDeleted: false },
      { populate: ["sensor"] },
    );
    if (!existing) {
      throw new AppError("Custom alert not found", 404);
    }

    em.assign(existing, {
      alertName: customAlert.alertName,
      sensor: customAlert.sensor
        ? em.getReference(SensorMaster, customAlert.sensor.id)
        : null,
      operation: customAlert.operation,
      value: customAlert.value,
      enableGeofenceRestrictions: customAlert.enableGeofenceRestrictions,
      geofenceSelectType: customAlert.geofenceSelectType ?? null,
      enableTripRestrictions: customAlert.enableTripRestrictions,
      tripSelectType: customAlert.tripSelectType ?? null,
      subject: customAlert.subject,
      messageBody: customAlert.messageBody,
      mobile: customAlert.mobile,
      status: customAlert.status,
      reason: customAlert.reason ?? null,
      ...(customAlert.updatedBy
        ? { updatedBy: em.getReference(Client, customAlert.updatedBy.id) }
        : {}),
      updatedAt: new Date(),
    });
    await em.flush();
    await em.populate(existing, ["sensor"]);
    return existing;
  }

  async deleteCustomAlert(
    externalId: string,
    deletedBy?: Client,
  ): Promise<void> {
    const em = this.em.fork();
    const customAlert = await em.findOne(CustomAlert, {
      externalId,
      isDeleted: false,
    });
    if (!customAlert) {
      throw new AppError("Custom alert not found", 404);
    }

    const now = new Date();
    customAlert.isDeleted = true;
    customAlert.deletedAt = now;
    customAlert.updatedAt = now;
    if (deletedBy) {
      customAlert.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }
}
