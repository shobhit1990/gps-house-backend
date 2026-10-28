import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateJobsheetDto,
  UpdateJobsheetDto,
} from "../domain/dto/JobsheetDto";
import { AddVehicle } from "../domain/entities/mysql/AddVehicle";
import { Client } from "../domain/entities/mysql/Client";
import { Jobsheet } from "../domain/entities/mysql/Jobsheet";
import { Technician } from "../domain/entities/mysql/Technician";
import { Status } from "../domain/enums/status";
import { IJobsheetRepository } from "../domain/repositories/mysql/IJobsheetRepository";
import { AppError } from "../utils/errors";
import {
  IJobsheetService,
  JobsheetResponse,
} from "./interfaces/IJobsheetService";

@injectable()
export class JobsheetService implements IJobsheetService {
  constructor(
    @inject("IJobsheetRepository")
    private readonly jobsheetRepository: IJobsheetRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getJobsheets(): Promise<JobsheetResponse[]> {
    const jobsheets = await this.jobsheetRepository.getJobsheets();
    return jobsheets.map((jobsheet) => this.toResponse(jobsheet));
  }

  async getJobsheetById(externalId: string): Promise<JobsheetResponse> {
    const jobsheet = await this.jobsheetRepository.getJobsheetById(externalId);
    if (!jobsheet) {
      throw new AppError("Jobsheet not found", 404);
    }
    return this.toResponse(jobsheet);
  }

  async createJobsheet(
    payload: CreateJobsheetDto,
    actorUserId?: number,
  ): Promise<JobsheetResponse> {
    await this.ensurePhoneIsAvailable(payload.phone);

    const [technician, vehicle, actor] = await Promise.all([
      this.findTechnician(payload.technician),
      payload.vehicle ? this.findVehicle(payload.vehicle) : undefined,
      this.findActor(actorUserId),
    ]);

    const jobsheet = new Jobsheet();
    jobsheet.technician = technician;
    jobsheet.vehicle = vehicle;
    jobsheet.createdBy = actor;
    this.assignFields(jobsheet, payload);
    return this.toResponse(
      await this.jobsheetRepository.createJobsheet(jobsheet),
    );
  }

  async updateJobsheet(
    externalId: string,
    payload: UpdateJobsheetDto,
    actorUserId?: number,
  ): Promise<JobsheetResponse> {
    const existing = await this.jobsheetRepository.getJobsheetById(externalId);
    if (!existing) {
      throw new AppError("Jobsheet not found", 404);
    }

    if (payload.phone !== undefined) {
      await this.ensurePhoneIsAvailable(payload.phone, externalId);
    }

    const actor = await this.findActor(actorUserId);
    if (actor) existing.updatedBy = actor;
    if (payload.technician !== undefined) {
      existing.technician = await this.findTechnician(payload.technician);
    }
    if (payload.vehicle !== undefined) {
      existing.vehicle = payload.vehicle
        ? await this.findVehicle(payload.vehicle)
        : undefined;
    }
    this.assignFields(existing, payload);
    return this.toResponse(
      await this.jobsheetRepository.updateJobsheet(existing),
    );
  }

  async deleteJobsheet(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.jobsheetRepository.deleteJobsheet(externalId, actor);
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
    if (!actor) {
      throw new AppError("User not found", 401);
    }
    return actor;
  }

  private async findVehicle(externalId: string): Promise<AddVehicle> {
    const vehicle = await this.em.fork().findOne(AddVehicle, {
      externalId,
      isDeleted: false,
    });
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }
    return vehicle;
  }

  private async findTechnician(externalId: string): Promise<Technician> {
    const technician = await this.em.fork().findOne(Technician, {
      externalId,
      isDeleted: false,
    });
    if (!technician) {
      throw new AppError("Technician not found", 404);
    }
    return technician;
  }

  private async ensurePhoneIsAvailable(
    phone: string,
    excludeExternalId?: string,
  ): Promise<void> {
    const normalizedPhone = phone.trim();
    if (
      await this.jobsheetRepository.isPhoneInUse(
        normalizedPhone,
        excludeExternalId,
      )
    ) {
      throw new AppError("Phone number is already in use", 409);
    }
  }

  private assignFields(
    jobsheet: Jobsheet,
    payload: CreateJobsheetDto | UpdateJobsheetDto,
  ): void {
    if (payload.contactPersonName !== undefined) {
      jobsheet.contactPersonName = payload.contactPersonName;
    }
    if (payload.phone !== undefined) jobsheet.phone = payload.phone.trim();
    if (payload.orderNo !== undefined) jobsheet.orderNo = payload.orderNo;
    if (payload.instruction !== undefined) {
      jobsheet.instruction = payload.instruction;
    }
    if (payload.status !== undefined) jobsheet.status = payload.status;
    if (payload.reason !== undefined) jobsheet.reason = payload.reason;
  }

  private toResponse(jobsheet: Jobsheet): JobsheetResponse {
    return {
      id: jobsheet.externalId,
      vehicle: jobsheet.vehicle
        ? {
            id: jobsheet.vehicle.externalId,
            vehicle: jobsheet.vehicle.vehicle,
            vehicleNickname: jobsheet.vehicle.vehicleNickname ?? null,
          }
        : null,
      technician: {
        id: jobsheet.technician.externalId,
        name: jobsheet.technician.name ?? null,
        companyName: jobsheet.technician.companyName,
        phone:
          jobsheet.technician.phone === undefined
            ? null
            : String(jobsheet.technician.phone),
      },
      contactPersonName: jobsheet.contactPersonName,
      phone: jobsheet.phone,
      orderNo: jobsheet.orderNo ?? null,
      instruction: jobsheet.instruction ?? null,
      status: jobsheet.status ?? null,
      reason: jobsheet.reason ?? null,
      createdAt: jobsheet.createdAt,
      updatedAt: jobsheet.updatedAt,
    };
  }
}
