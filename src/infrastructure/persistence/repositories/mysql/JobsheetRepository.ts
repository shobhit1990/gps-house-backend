import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { AddVehicle } from "../../../../domain/entities/mysql/AddVehicle";
import { Client } from "../../../../domain/entities/mysql/Client";
import { Jobsheet } from "../../../../domain/entities/mysql/Jobsheet";
import { Technician } from "../../../../domain/entities/mysql/Technician";
import { IJobsheetRepository } from "../../../../domain/repositories/mysql/IJobsheetRepository";
import { AppError } from "../../../../utils/errors";

const populatedRelations = ["vehicle", "technician"] as const;

@injectable()
export class JobsheetRepository implements IJobsheetRepository {
  constructor(private readonly em: EntityManager) {}

  async getJobsheets(): Promise<Jobsheet[]> {
    return this.em
      .fork()
      .find(
        Jobsheet,
        { isDeleted: false },
        { populate: [...populatedRelations]},
      );
  }

  async getJobsheetById(externalId: string): Promise<Jobsheet | null> {
    return this.em
      .fork()
      .findOne(
        Jobsheet,
        { externalId, isDeleted: false },
        { populate: [...populatedRelations] },
      );
  }

  async isPhoneInUse(
    phone: string,
    excludeExternalId?: string,
  ): Promise<boolean> {
    const jobsheets = await this.em
      .fork()
      .find(
        Jobsheet,
        { isDeleted: false },
        { fields: ["externalId", "phone"] },
      );
    const normalizedPhone = this.normalizePhone(phone);
    return jobsheets.some(
      (jobsheet) =>
        jobsheet.externalId !== excludeExternalId &&
        this.normalizePhone(jobsheet.phone) === normalizedPhone,
    );
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "");
  }

  async createJobsheet(jobsheet: Jobsheet): Promise<Jobsheet> {
    const em = this.em.fork();
    jobsheet.technician = em.getReference(Technician, jobsheet.technician.id);
    if (jobsheet.vehicle) {
      jobsheet.vehicle = em.getReference(AddVehicle, jobsheet.vehicle.id);
    }
    if (jobsheet.createdBy) {
      jobsheet.createdBy = em.getReference(Client, jobsheet.createdBy.id);
    }
    await em.persistAndFlush(jobsheet);
    await em.populate(jobsheet, [...populatedRelations]);
    return jobsheet;
  }

  async updateJobsheet(jobsheet: Jobsheet): Promise<Jobsheet> {
    const em = this.em.fork();
    const existing = await em.findOne(Jobsheet, {
      externalId: jobsheet.externalId,
      isDeleted: false,
    });

    if (!existing) {
      throw new AppError("Jobsheet not found", 404);
    }

    em.assign(existing, {
      vehicle: jobsheet.vehicle
        ? em.getReference(AddVehicle, jobsheet.vehicle.id)
        : null,
      technician: em.getReference(Technician, jobsheet.technician.id),
      contactPersonName: jobsheet.contactPersonName,
      phone: jobsheet.phone,
      orderNo: jobsheet.orderNo,
      instruction: jobsheet.instruction,
      status: jobsheet.status,
      reason: jobsheet.reason,
      ...(jobsheet.updatedBy
        ? { updatedBy: em.getReference(Client, jobsheet.updatedBy.id) }
        : {}),
    });
    await em.flush();
    await em.populate(existing, [...populatedRelations]);
    return existing;
  }

  async deleteJobsheet(externalId: string, deletedBy?: Client): Promise<void> {
    const em = this.em.fork();
    const jobsheet = await em.findOne(Jobsheet, {
      externalId,
      isDeleted: false,
    });

    if (!jobsheet) {
      throw new AppError("Jobsheet not found", 404);
    }

    jobsheet.isDeleted = true;
    if (deletedBy) {
      jobsheet.deletedBy = em.getReference(Client, deletedBy.id);
    }
    jobsheet.updatedAt = new Date();
    await em.flush();
  }
}
