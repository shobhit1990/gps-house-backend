import { injectable } from "tsyringe";
import { EntityManager } from "@mikro-orm/mysql";
import { Alert } from "../../../../domain/entities/mysql/Alert";
import { AddGroup } from "../../../../domain/entities/mysql/AddGroup";
import { AddVehicle } from "../../../../domain/entities/mysql/AddVehicle";
import { AlertType } from "../../../../domain/entities/mysql/AlertType";
import { Client } from "../../../../domain/entities/mysql/Client";
import { Transporter } from "../../../../domain/entities/mysql/Transporter";
import { User } from "../../../../domain/entities/mysql/User";
import { AlertAssignType } from "../../../../domain/enums/AlertAssignType";
import { AppError } from "../../../../utils/errors";
import {
  CreateAlertRecord,
  IAlertRepository,
  UpdateAlertRecord,
} from "../../../../domain/repositories/mysql/IAlertRepository";

@injectable()
export class AlertRepository implements IAlertRepository {
  constructor(private readonly em: EntityManager) {}

  async getAlert(): Promise<AlertType[]> {
    return this.em.fork().find(AlertType, {
      isDeleted: false,
    });
  }

  async createAlerts(records: CreateAlertRecord[]): Promise<Alert[]> {
    const em = this.em.fork();
    const alerts = records.map((record) => {
      const alert = new Alert();
      alert.alertName = record.alertName;
      alert.alertAssignedTo = record.alertAssignedTo;
      alert.vehicle = em.getReference(AddVehicle, record.vehicleId);
      alert.alertType = em.getReference(AlertType, record.alertTypeId);
      alert.mobile = record.mobile;
      alert.status = record.status;
      alert.reason = record.reason;

      switch (record.alertAssignedTo) {
        case AlertAssignType.TRANSPORTER:
          alert.transporter = em.getReference(Transporter, record.assignedToId);
          break;
        case AlertAssignType.USER:
          alert.user = em.getReference(User, record.assignedToId);
          break;
        case AlertAssignType.GROUP:
          alert.group = em.getReference(AddGroup, record.assignedToId);
          break;
      }

      if (record.createdById !== undefined) {
        alert.createdBy = em.getReference(Client, record.createdById);
      }

      return alert;
    });

    await em.persistAndFlush(alerts);
    await em.populate(alerts, [
      "transporter",
      "user",
      "group",
      "vehicle",
      "alertType",
    ]);
    return alerts;
  }

  async getAlerts(): Promise<Alert[]> {
    return this.em.fork().find(
      Alert,
      { isDeleted: false },
      {
        populate: ["transporter", "user", "group", "vehicle", "alertType"],
        orderBy: { createdAt: "DESC" },
      },
    );
  }

  async getAlertById(externalId: string): Promise<Alert | null> {
    return this.em
      .fork()
      .findOne(
        Alert,
        { externalId, isDeleted: false },
        { populate: ["transporter", "user", "group", "vehicle", "alertType"] },
      );
  }

  async updateAlert(
    externalId: string,
    record: UpdateAlertRecord,
  ): Promise<Alert> {
    const em = this.em.fork();
    const alert = await em.findOne(
      Alert,
      { externalId, isDeleted: false },
      { populate: ["transporter", "user", "group", "vehicle", "alertType"] },
    );
    if (!alert) {
      throw new AppError("Alert not found", 404);
    }

    alert.alertName = record.alertName;
    alert.alertAssignedTo = record.alertAssignedTo;
    alert.transporter = null;
    alert.user = null;
    alert.group = null;
    switch (record.alertAssignedTo) {
      case AlertAssignType.TRANSPORTER:
        alert.transporter = em.getReference(Transporter, record.assignedToId);
        break;
      case AlertAssignType.USER:
        alert.user = em.getReference(User, record.assignedToId);
        break;
      case AlertAssignType.GROUP:
        alert.group = em.getReference(AddGroup, record.assignedToId);
        break;
    }
    alert.vehicle = em.getReference(AddVehicle, record.vehicleId);
    alert.alertType = em.getReference(AlertType, record.alertTypeId);
    alert.mobile = record.mobile;
    alert.status = record.status;
    alert.reason = record.reason;
    if (record.updatedById !== undefined) {
      alert.updatedBy = em.getReference(Client, record.updatedById);
    }

    await em.flush();
    await em.populate(alert, [
      "transporter",
      "user",
      "group",
      "vehicle",
      "alertType",
    ]);
    return alert;
  }

  async deleteAlert(externalId: string, deletedById?: number): Promise<void> {
    const em = this.em.fork();
    const alert = await em.findOne(Alert, { externalId, isDeleted: false });
    if (!alert) {
      throw new AppError("Alert not found", 404);
    }

    alert.isDeleted = true;
    alert.deletedAt = new Date();
    if (deletedById !== undefined) {
      alert.deletedBy = em.getReference(Client, deletedById);
    }
    await em.flush();
  }
}
