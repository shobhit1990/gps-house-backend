import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateParkedScheduleDto,
  UpdateParkedScheduleDto,
} from "../domain/dto/ParkedScheduleDto";
import { AddVehicle } from "../domain/entities/mysql/AddVehicle";
import { Client } from "../domain/entities/mysql/Client";
import { ParkedSchedule } from "../domain/entities/mysql/ParkedSchedule";
import { Transporter } from "../domain/entities/mysql/Transporter";
import { Scheduled } from "../domain/enums/Scheduled";
import { Status } from "../domain/enums/status";
import { IParkedScheduleRepository } from "../domain/repositories/mysql/IParkedScheduleRepository";
import { AppError } from "../utils/errors";
import {
  IParkedScheduleService,
  ParkedScheduleResponse,
} from "./interfaces/IParkedScheduleService";

@injectable()
export class ParkedScheduleService implements IParkedScheduleService {
  constructor(
    @inject("IParkedScheduleRepository")
    private readonly repository: IParkedScheduleRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getParkedSchedules(): Promise<ParkedScheduleResponse[]> {
    const schedules = await this.repository.getParkedSchedules();
    return schedules.map((schedule) => this.toResponse(schedule));
  }

  async getParkedScheduleById(
    externalId: string,
  ): Promise<ParkedScheduleResponse> {
    const schedule = await this.repository.getParkedScheduleById(externalId);
    if (!schedule) {
      throw new AppError("Parked schedule not found", 404);
    }
    return this.toResponse(schedule);
  }

  async createParkedSchedule(
    payload: CreateParkedScheduleDto,
    actorUserId?: number,
  ): Promise<ParkedScheduleResponse> {
    const { client, transporter, vehicle } = await this.resolveMasters(
      payload.client,
      payload.transporter,
      payload.vehicle,
    );
    const dates = this.resolveDates(
      payload.scheduled,
      payload.startDate,
      payload.endDate,
    );
    const actor = await this.findActor(actorUserId);

    const schedule = new ParkedSchedule();
    schedule.client = client;
    schedule.transporter = transporter;
    schedule.vehicle = vehicle;
    schedule.scheduled = payload.scheduled;
    schedule.startDate = dates.startDate;
    schedule.endDate = dates.endDate;
    schedule.scheduledFrom = payload.scheduledFrom;
    schedule.scheduledTill = payload.scheduledTill;
    schedule.status = payload.status ?? null;
    schedule.reason = payload.reason ?? null;
    schedule.createdBy = actor;

    return this.toResponse(
      await this.repository.createParkedSchedule(schedule),
    );
  }

  async updateParkedSchedule(
    externalId: string,
    payload: UpdateParkedScheduleDto,
    actorUserId?: number,
  ): Promise<ParkedScheduleResponse> {
    if (Object.keys(payload).length === 0) {
      throw new AppError(
        "At least one field is required to update parked schedule",
        400,
      );
    }

    const existing = await this.repository.getParkedScheduleById(externalId);
    if (!existing) {
      throw new AppError("Parked schedule not found", 404);
    }

    const clientId = payload.client ?? existing.client.externalId;
    const transporterId =
      payload.transporter ?? existing.transporter.externalId;
    const vehicleId = payload.vehicle ?? existing.vehicle.externalId;
    const masters = await this.resolveMasters(
      clientId,
      transporterId,
      vehicleId,
    );
    const scheduled = payload.scheduled ?? existing.scheduled;
    const dates = this.resolveDates(
      scheduled,
      payload.startDate !== undefined
        ? payload.startDate
        : this.asDateString(existing.startDate),
      payload.endDate !== undefined
        ? payload.endDate
        : this.asDateString(existing.endDate),
    );

    existing.client = masters.client;
    existing.transporter = masters.transporter;
    existing.vehicle = masters.vehicle;
    existing.scheduled = scheduled;
    existing.startDate = dates.startDate;
    existing.endDate = dates.endDate;
    if (payload.scheduledFrom !== undefined) {
      existing.scheduledFrom = payload.scheduledFrom;
    }
    if (payload.scheduledTill !== undefined) {
      existing.scheduledTill = payload.scheduledTill;
    }
    if (payload.status !== undefined) existing.status = payload.status;
    if (payload.reason !== undefined) existing.reason = payload.reason;

    const actor = await this.findActor(actorUserId);
    if (actor) existing.updatedBy = actor;
    return this.toResponse(
      await this.repository.updateParkedSchedule(existing),
    );
  }

  async deleteParkedSchedule(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.repository.deleteParkedSchedule(externalId, actor);
  }

  private async resolveMasters(
    clientId: string,
    transporterId: string,
    vehicleId: string,
  ): Promise<{
    client: Client;
    transporter: Transporter;
    vehicle: AddVehicle;
  }> {
    const em = this.em.fork();
    const [client, transporter, vehicle] = await Promise.all([
      em.findOne(Client, { externalId: clientId, isDeleted: false }),
      em.findOne(Transporter, { externalId: transporterId, isDeleted: false }),
      em.findOne(AddVehicle, { externalId: vehicleId, isDeleted: false }),
    ]);

    if (!client) throw new AppError("Client not found", 404);
    if (!transporter) throw new AppError("Transporter not found", 404);
    if (!vehicle) throw new AppError("Vehicle not found", 404);
    if (client.status !== Status.ACTIVE) {
      throw new AppError("Client is inactive", 400);
    }
    if (transporter.status !== Status.ACTIVE) {
      throw new AppError("Transporter is inactive", 400);
    }
    if (vehicle.status !== undefined && vehicle.status !== Status.ACTIVE) {
      throw new AppError("Vehicle is inactive", 400);
    }
    return { client, transporter, vehicle };
  }

  private resolveDates(
    scheduled: Scheduled,
    startValue?: string | null,
    endValue?: string | null,
  ): { startDate: string | null; endDate: string | null } {
    if (scheduled === Scheduled.DAILY) {
      if (startValue || endValue) {
        throw new AppError(
          "startDate and endDate must not be sent for daily schedules",
          400,
        );
      }
      return { startDate: null, endDate: null };
    }
    if (!startValue || !endValue) {
      throw new AppError(
        "startDate and endDate are required for non-daily schedules",
        400,
      );
    }

    const startDate = new Date(startValue);
    const endDate = new Date(endValue);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new AppError("startDate and endDate must be valid dates", 400);
    }
    if (startDate.getTime() > endDate.getTime()) {
      throw new AppError("startDate must be before or equal to endDate", 400);
    }
    return {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
    };
  }

  private asDateString(value?: string | null): string | null {
    if (value == null) return null;

    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new AppError("Stored parked schedule date is invalid");
    }
    return date.toISOString().slice(0, 10);
  }

  private async findActor(userId?: number): Promise<Client | undefined> {
    if (userId === undefined) return undefined;
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new AppError("Invalid user ID", 401);
    }
    const actor = await this.em.fork().findOne(Client, {
      id: userId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!actor) throw new AppError("User not found", 401);
    return actor;
  }

  private toResponse(schedule: ParkedSchedule): ParkedScheduleResponse {
    return {
      id: schedule.externalId,
      client: {
        id: schedule.client.externalId,
        name: schedule.client.name ?? "",
      },
      transporter: {
        id: schedule.transporter.externalId,
        companyName: schedule.transporter.companyName,
      },
      vehicle: {
        id: schedule.vehicle.externalId,
        vehicle: schedule.vehicle.vehicle,
      },
      scheduled: schedule.scheduled,
      startDate: this.asDateString(schedule.startDate),
      endDate: this.asDateString(schedule.endDate),
      scheduledFrom: schedule.scheduledFrom.slice(0, 5),
      scheduledTill: schedule.scheduledTill.slice(0, 5),
      status: schedule.status ?? null,
      reason: schedule.reason ?? null,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    };
  }
}
