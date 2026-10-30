import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { ParkedSchedule } from "../../../../domain/entities/mysql/ParkedSchedule";
import { AddVehicle } from "../../../../domain/entities/mysql/AddVehicle";
import { Client } from "../../../../domain/entities/mysql/Client";
import { Transporter } from "../../../../domain/entities/mysql/Transporter";
import { IParkedScheduleRepository } from "../../../../domain/repositories/mysql/IParkedScheduleRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class ParkedScheduleRepository implements IParkedScheduleRepository {
  constructor(private readonly em: EntityManager) {}

  async getParkedSchedules(): Promise<ParkedSchedule[]> {
    return this.em
      .fork()
      .find(
        ParkedSchedule,
        { isDeleted: false },
        { populate: ["client", "transporter", "vehicle"] },
      );
  }

  async getParkedScheduleById(
    externalId: string,
  ): Promise<ParkedSchedule | null> {
    return this.em
      .fork()
      .findOne(
        ParkedSchedule,
        { externalId, isDeleted: false },
        { populate: ["client", "transporter", "vehicle"] },
      );
  }

  async createParkedSchedule(
    schedule: ParkedSchedule,
  ): Promise<ParkedSchedule> {
    const em = this.em.fork();
    schedule.client = em.getReference(Client, schedule.client.id);
    schedule.transporter = em.getReference(
      Transporter,
      schedule.transporter.id,
    );
    schedule.vehicle = em.getReference(AddVehicle, schedule.vehicle.id);
    if (schedule.createdBy) {
      schedule.createdBy = em.getReference(Client, schedule.createdBy.id);
    }
    await em.persistAndFlush(schedule);
    await em.populate(schedule, ["client", "transporter", "vehicle"]);
    return schedule;
  }

  async updateParkedSchedule(
    schedule: ParkedSchedule,
  ): Promise<ParkedSchedule> {
    const em = this.em.fork();
    const existing = await em.findOne(
      ParkedSchedule,
      { externalId: schedule.externalId, isDeleted: false },
      { populate: ["client", "transporter", "vehicle"] },
    );
    if (!existing) {
      throw new AppError("Parked schedule not found", 404);
    }

    em.assign(existing, {
      client: em.getReference(Client, schedule.client.id),
      transporter: em.getReference(Transporter, schedule.transporter.id),
      vehicle: em.getReference(AddVehicle, schedule.vehicle.id),
      scheduled: schedule.scheduled,
      startDate: schedule.startDate ?? null,
      endDate: schedule.endDate ?? null,
      scheduledFrom: schedule.scheduledFrom,
      scheduledTill: schedule.scheduledTill,
      status: schedule.status ?? null,
      reason: schedule.reason ?? null,
      ...(schedule.updatedBy
        ? { updatedBy: em.getReference(Client, schedule.updatedBy.id) }
        : {}),
      updatedAt: new Date(),
    });
    await em.flush();
    await em.populate(existing, ["client", "transporter", "vehicle"]);
    return existing;
  }

  async deleteParkedSchedule(
    externalId: string,
    deletedBy?: Client,
  ): Promise<void> {
    const em = this.em.fork();
    const schedule = await em.findOne(ParkedSchedule, {
      externalId,
      isDeleted: false,
    });
    if (!schedule) {
      throw new AppError("Parked schedule not found", 404);
    }

    const now = new Date();
    schedule.isDeleted = true;
    schedule.deletedAt = now;
    schedule.updatedAt = now;
    if (deletedBy) {
      schedule.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }
}
