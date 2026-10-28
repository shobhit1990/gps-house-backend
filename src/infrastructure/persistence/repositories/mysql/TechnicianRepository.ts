import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { Technician } from "../../../../domain/entities/mysql/Technician";
import { Client } from "../../../../domain/entities/mysql/Client";
import { TimeZone } from "../../../../domain/entities/mysql/TimeZone";
import { ITechnicianRepository } from "../../../../domain/repositories/mysql/ITechnicianRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class TechnicianRepository implements ITechnicianRepository {
  constructor(private readonly em: EntityManager) {}

  async getTechnicians(): Promise<Technician[]> {
    return this.em
      .fork()
      .find(
        Technician,
        { isDeleted: false },
        { populate: ["client", "timezone"]},
      );
  }

  async getTechnicianById(externalId: string): Promise<Technician | null> {
    return this.em
      .fork()
      .findOne(
        Technician,
        { externalId, isDeleted: false },
        { populate: ["client", "timezone"] },
      );
  }

  async createTechnician(technician: Technician): Promise<Technician> {
    const em = this.em.fork();
    technician.client = em.getReference(Client, technician.client.id);
    technician.timezone = em.getReference(TimeZone, technician.timezone.id);
    if (technician.createdBy) {
      technician.createdBy = em.getReference(Client, technician.createdBy.id);
    }
    await em.persistAndFlush(technician);
    await em.populate(technician, ["client", "timezone"]);
    return technician;
  }

  async updateTechnician(technician: Technician): Promise<Technician> {
    const em = this.em.fork();
    const existing = await em.findOne(Technician, {
      externalId: technician.externalId,
      isDeleted: false,
    });

    if (!existing) {
      throw new AppError("Technician not found", 404);
    }

    em.assign(existing, {
      userName: technician.userName,
      password: technician.password,
      companyName: technician.companyName,
      name: technician.name,
      email: technician.email,
      phone: technician.phone,
      address: technician.address,
      timezone: em.getReference(TimeZone, technician.timezone.id),
      client: em.getReference(Client, technician.client.id),
      status: technician.status,
      reason: technician.reason,
      ...(technician.updatedBy
        ? { updatedBy: em.getReference(Client, technician.updatedBy.id) }
        : {}),
    });
    await em.flush();
    await em.populate(existing, ["client", "timezone"]);
    return existing;
  }

  async deleteTechnician(
    externalId: string,
    deletedBy?: Client,
  ): Promise<void> {
    const em = this.em.fork();
    const technician = await em.findOne(Technician, {
      externalId,
      isDeleted: false,
    });

    if (!technician) {
      throw new AppError("Technician not found", 404);
    }

    technician.isDeleted = true;
    if (deletedBy) {
      technician.deletedBy = em.getReference(Client, deletedBy.id);
    }
    technician.updatedAt = new Date();
    await em.flush();
  }
}
