import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { AddAlert } from "../../../../domain/entities/mysql/AddAlert";
import { Client } from "../../../../domain/entities/mysql/Client";
import { IAddAlertRepository } from "../../../../domain/repositories/mysql/IAddAlertRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class AddAlertRepository implements IAddAlertRepository {
  constructor(private readonly em: EntityManager) {}

  async getAddAlerts(): Promise<AddAlert[]> {
    return this.em.fork().find(AddAlert, { isDeleted: false });
  }

  async getAddAlertById(externalId: string): Promise<AddAlert | null> {
    return this.em
      .fork()
      .findOne(AddAlert, { externalId, isDeleted: false });
  }

  async createAddAlert(addAlert: AddAlert): Promise<AddAlert> {
    const em = this.em.fork();
    if (addAlert.createdBy) {
      addAlert.createdBy = em.getReference(Client, addAlert.createdBy.id);
    }
    await em.persistAndFlush(addAlert);
    return addAlert;
  }

  async updateAddAlert(addAlert: AddAlert): Promise<AddAlert> {
    const em = this.em.fork();
    const existing = await em.findOne(AddAlert, {
      externalId: addAlert.externalId,
      isDeleted: false,
    });
    if (!existing) {
      throw new AppError("Add alert not found", 404);
    }

    em.assign(existing, {
      alertTypes: addAlert.alertTypes,
      overDriveDailyDistance: addAlert.overDriveDailyDistance ?? null,
      overDriveWeeklyDistance: addAlert.overDriveWeeklyDistance ?? null,
      underDriveDailyDistance: addAlert.underDriveDailyDistance ?? null,
      underDriveWeeklyDistance: addAlert.underDriveWeeklyDistance ?? null,
      mobile: addAlert.mobile,
      status: addAlert.status,
      reason: addAlert.reason ?? null,
      ...(addAlert.updatedBy
        ? { updatedBy: em.getReference(Client, addAlert.updatedBy.id) }
        : {}),
      updatedAt: new Date(),
    });
    await em.flush();
    return existing;
  }

  async deleteAddAlert(
    externalId: string,
    deletedBy?: Client,
  ): Promise<void> {
    const em = this.em.fork();
    const addAlert = await em.findOne(AddAlert, {
      externalId,
      isDeleted: false,
    });
    if (!addAlert) {
      throw new AppError("Add alert not found", 404);
    }

    const now = new Date();
    addAlert.isDeleted = true;
    addAlert.deletedAt = now;
    addAlert.updatedAt = now;
    if (deletedBy) {
      addAlert.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }
}
