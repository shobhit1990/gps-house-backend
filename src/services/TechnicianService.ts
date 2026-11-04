import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateTechnicianDto,
  UpdateTechnicianDto,
} from "../domain/dto/TechnicianDto";
import { Client } from "../domain/entities/mysql/Client";
import { Technician } from "../domain/entities/mysql/Technician";
import { TimeZone } from "../domain/entities/mysql/TimeZone";
import { User } from "../domain/entities/mysql/User";
import { Status } from "../domain/enums/status";
import { UserType } from "../domain/enums/UserType";
import { ITechnicianRepository } from "../domain/repositories/mysql/ITechnicianRepository";
import { AppError } from "../utils/errors";
import { hashPassword } from "../utils/passwordHash";
import {
  ITechnicianService,
  TechnicianResponse,
} from "./interfaces/ITechnicianService";

@injectable()
export class TechnicianService implements ITechnicianService {
  constructor(
    @inject("ITechnicianRepository")
    private readonly technicianRepository: ITechnicianRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getTechnicians(): Promise<TechnicianResponse[]> {
    const technicians = await this.technicianRepository.getTechnicians();
    return technicians.map((technician) => this.toResponse(technician));
  }

  async getTechnicianById(externalId: string): Promise<TechnicianResponse> {
    const technician =
      await this.technicianRepository.getTechnicianById(externalId);
    if (!technician) {
      throw new AppError("Technician not found", 404);
    }
    return this.toResponse(technician);
  }

  async createTechnician(
    payload: CreateTechnicianDto,
    actorUserId?: number,
  ): Promise<TechnicianResponse> {
    if (payload.password !== payload.confirmPassword) {
      throw new AppError("Password and Confirm Password do not match", 400);
    }

    await this.ensureUniqueFields(payload);
    const [client, timezone, actor] = await Promise.all([
      this.findClient(payload.client),
      this.findTimezone(payload.timezone),
      this.findActor(actorUserId),
    ]);
    const unifiedClient = await this.em.fork().findOne(User, {
      externalId: client.externalId,
      userType: UserType.CLIENT,
      isDeleted: false,
    });
    if (!unifiedClient) {
      throw new AppError("Unified Client account not found", 400);
    }

    const technician = new Technician();
    technician.userName = payload.userName.trim();
    technician.password = await hashPassword(payload.password);
    technician.companyName = payload.companyName;
    technician.name = payload.name;
    technician.email = payload.email?.trim().toLowerCase();
    technician.phone = payload.phone;
    technician.address = payload.address;
    technician.client = client;
    technician.timezone = timezone;
    technician.createdBy = actor;
    technician.status = payload.status ?? Status.ACTIVE;
    technician.reason = payload.reason;

    const user = new User();
    user.externalId = technician.externalId;
    user.userName = technician.userName;
    user.password = technician.password;
    user.userType = UserType.TECHNICIAN;
    user.companyName = technician.companyName;
    user.name = technician.name;
    user.email = technician.email;
    user.phone =
      technician.phone === undefined ? undefined : String(technician.phone);
    user.address = technician.address;
    user.companyAddress = technician.address;
    user.client = unifiedClient;
    user.timezone = timezone;
    user.status = technician.status;
    user.reason = technician.reason;

    const created = await this.technicianRepository.createTechnician(
      technician,
      user,
    );
    return this.toResponse(created);
  }

  async updateTechnician(
    externalId: string,
    payload: UpdateTechnicianDto,
    actorUserId?: number,
  ): Promise<TechnicianResponse> {
    const technician =
      await this.technicianRepository.getTechnicianById(externalId);
    if (!technician) {
      throw new AppError("Technician not found", 404);
    }

    const actor = await this.findActor(actorUserId);
    if (actor) technician.updatedBy = actor;

    if (
      payload.password !== undefined ||
      payload.confirmPassword !== undefined
    ) {
      if (
        !payload.password ||
        !payload.confirmPassword ||
        payload.password !== payload.confirmPassword
      ) {
        throw new AppError("Password and Confirm Password do not match", 400);
      }
      technician.password = await hashPassword(payload.password);
    }

    await this.ensureUniqueFields(payload, externalId);
    if (payload.client !== undefined) {
      technician.client = await this.findClient(payload.client);
    }
    if (payload.timezone !== undefined) {
      technician.timezone = await this.findTimezone(payload.timezone);
    }
    if (payload.userName !== undefined) {
      technician.userName = payload.userName.trim();
    }
    if (payload.companyName !== undefined) {
      technician.companyName = payload.companyName;
    }
    if (payload.name !== undefined) technician.name = payload.name;
    if (payload.email !== undefined) {
      technician.email = payload.email.trim().toLowerCase();
    }
    if (payload.phone !== undefined) technician.phone = payload.phone;
    if (payload.address !== undefined) technician.address = payload.address;
    if (payload.status !== undefined) technician.status = payload.status;
    if (payload.reason !== undefined) technician.reason = payload.reason;

    const updated =
      await this.technicianRepository.updateTechnician(technician);

    const em = this.em.fork();
    const unifiedUser = await em.findOne(User, {
      externalId,
      isDeleted: false,
    });
    if (!unifiedUser) {
      throw new AppError("Unified Technician account not found", 404);
    }

    unifiedUser.userName = updated.userName;
    unifiedUser.password = updated.password;
    unifiedUser.companyName = updated.companyName;
    unifiedUser.name = updated.name;
    unifiedUser.email = updated.email;
    unifiedUser.phone =
      updated.phone === undefined ? undefined : String(updated.phone);
    unifiedUser.address = updated.address;
    unifiedUser.companyAddress = updated.address;
    unifiedUser.timezone = updated.timezone;
    unifiedUser.status = updated.status ?? Status.ACTIVE;
    unifiedUser.reason = updated.reason;
    unifiedUser.updatedAt = new Date();
    const clientUser = await em.findOne(User, {
      externalId: updated.client.externalId,
      userType: UserType.CLIENT,
      isDeleted: false,
    });
    if (!clientUser) {
      throw new AppError("Unified Client account not found", 404);
    }
    unifiedUser.client = clientUser;
    await em.flush();

    return this.toResponse(updated);
  }

  async deleteTechnician(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.technicianRepository.deleteTechnician(externalId, actor);
    const em = this.em.fork();
    const unifiedUser = await em.findOne(User, {
      externalId,
      isDeleted: false,
    });
    if (unifiedUser) {
      unifiedUser.isDeleted = true;
      unifiedUser.deletedAt = new Date();
      unifiedUser.updatedAt = new Date();
      await em.flush();
    }
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

  private async findClient(externalId: string): Promise<Client> {
    const client = await this.em.fork().findOne(Client, {
      externalId,
      isDeleted: false,
    });
    if (!client) {
      throw new AppError("Client not found", 404);
    }
    return client;
  }

  private async findTimezone(externalId: string): Promise<TimeZone> {
    const timezone = await this.em.fork().findOne(TimeZone, {
      externalId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!timezone) {
      throw new AppError("Active timezone not found", 404);
    }
    return timezone;
  }

  private async ensureUniqueFields(
    payload: Pick<UpdateTechnicianDto, "userName" | "email" | "phone">,
    excludeExternalId?: string,
  ): Promise<void> {
    const userName = payload.userName?.trim();
    const email = payload.email?.trim().toLowerCase();
    const conditions: Array<Record<string, string | number>> = [];
    if (userName) {
      conditions.push({ userName });
    }
    if (email) {
      conditions.push({ email });
    }
    if (payload.phone !== undefined) {
      conditions.push({ phone: payload.phone });
    }
    if (!conditions.length) return;

    const existing = await this.em.fork().findOne(Technician, {
      $or: conditions,
      isDeleted: false,
      ...(excludeExternalId ? { externalId: { $ne: excludeExternalId } } : {}),
    });
    if (existing) {
      const field =
        userName && existing.userName === userName
          ? "userName"
          : email && existing.email?.toLowerCase() === email
            ? "email"
            : "phone";
      const label =
        field === "userName"
          ? "Username"
          : field === "email"
            ? "Email"
            : "Phone";
      const error = new AppError(`${label} already exists`, 400);
      error.errors.push({
        field,
        message: `${label} already exists`,
      });
      throw error;
    }

    const commonConditions = conditions.map((condition) =>
      "phone" in condition ? { phone: String(condition.phone) } : condition,
    );
    const commonUser = await this.em.fork().findOne(User, {
      $or: commonConditions,
      isDeleted: false,
      ...(excludeExternalId ? { externalId: { $ne: excludeExternalId } } : {}),
    });
    if (commonUser) {
      const field =
        userName && commonUser.userName === userName
          ? "userName"
          : email && commonUser.email?.toLowerCase() === email
            ? "email"
            : "phone";
      const label =
        field === "userName"
          ? "Username"
          : field === "email"
            ? "Email"
            : "Phone";
      const error = new AppError(`${label} already exists`, 400);
      error.errors.push({ field, message: `${label} already exists` });
      throw error;
    }
  }

  private toResponse(technician: Technician): TechnicianResponse {
    return {
      id: technician.externalId,
      userName: technician.userName,
      companyName: technician.companyName,
      name: technician.name ?? null,
      email: technician.email ?? null,
      phone: technician.phone?.toString() ?? null,
      address: technician.address ?? null,
      timezone: {
        id: technician.timezone.externalId,
        timeZone: technician.timezone.timeZone,
      },
      client: {
        id: technician.client.externalId,
        name: technician.client.name ?? null,
        companyName: technician.client.companyName,
      },
      status: technician.status ?? null,
      reason: technician.reason ?? null,
      createdAt: technician.createdAt,
      updatedAt: technician.updatedAt,
    };
  }
}
