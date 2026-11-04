import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import { IClientService } from "./interfaces/IClientService";
import { IClientRepository } from "../domain/repositories/mysql/IClientRepository";
import { CreateClientDto, UpdateClientDto } from "../domain/dto/ClientDto";
import { Client } from "../domain/entities/mysql/Client";
import { AppError } from "../utils/errors";
import { FormError } from "../domain/dto/FormError";
import { Owner } from "../domain/entities/mysql/Owner";
import { Language } from "../domain/entities/mysql/Language";
import { TimeZone } from "../domain/entities/mysql/TimeZone";
import { User } from "../domain/entities/mysql/User";
import { UserType } from "../domain/enums/UserType";
import { Status } from "../domain/enums/status";
import { hashPassword } from "../utils/passwordHash";

@injectable()
export class ClientService implements IClientService {
  constructor(
    @inject("IClientRepository")
    private readonly clientRepository: IClientRepository,

    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getClient(): Promise<any[]> {
    const client = await this.clientRepository.getClient();

    return client.map((client) => ({
      id: client.externalId,
      owner_name: client.owner_name?.ownerName,
      language: client.language?.languageName,
      timezone: client.timezone?.timeZone,
      vehicle_count: client.vehicle_count,
      userName: client.userName,
      clientImage: client.clientImage ?? null,
      companyName: client.companyName,
      name: client.name,
      email: client.email,
      phone: client.phone,
      domain: client.domain,
      address: client.address,
      status: client.status,
      reason: client.reason ?? null,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    }));
  }

  async getClientById(externalId: string): Promise<any | null> {
    const client = await this.clientRepository.getClientById(externalId);

    if (!client) {
      throw new AppError("client not found", 404, null);
    }

    return {
      id: client.externalId,
      owner_name: client.owner_name?.ownerName,
      language: client.language?.languageName,
      timezone: client.timezone?.timeZone,
      vehicle_count: client.vehicle_count,
      userName: client.userName,
      clientImage: client.clientImage ?? null,
      companyName: client.companyName,
      name: client.name,
      email: client.email,
      phone: client.phone,
      domain: client.domain,
      address: client.address,
      status: client.status,
      reason: client.reason ?? null,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  async createClient(payload: CreateClientDto): Promise<Client> {
    // 1. Check duplicate username

    const existingUsername = await this.clientRepository.getClientByUsername(
      payload.userName.trim(),
    );

    if (existingUsername) {
      const error = new FormError();
      error.field = "userName";
      error.message = "Username already exists";

      throw new AppError(
        "Validation failed. Please check the errors and try again.",
        400,
        null,
        [error],
      );
    }

    const commonUserWithUsername = await this.em.fork().findOne(User, {
      userName: payload.userName.trim(),
      isDeleted: false,
    });
    if (commonUserWithUsername) {
      throw new AppError("Username already exists", 400);
    }

    const duplicateConditions: Array<Record<string, string>> = [];
    if (payload.email) duplicateConditions.push({ email: payload.email });
    if (payload.phone !== undefined) {
      duplicateConditions.push({ phone: String(payload.phone) });
    }
    if (duplicateConditions.length) {
      const duplicateUser = await this.em.fork().findOne(User, {
        $or: duplicateConditions,
        isDeleted: false,
      });
      if (duplicateUser) {
        const field = duplicateUser.email === payload.email ? "email" : "phone";
        throw new AppError(`${field} already exists`, 400);
      }
    }

    if (payload.password !== payload.confirmPassword) {
      throw new AppError("Password and Confirm Password do not match", 400);
    }

    const emFork = this.em.fork();

    const owner = await emFork.findOne(Owner, {
      externalId: payload.owner_name,
    });

    if (!owner) {
      throw new AppError("Invalid Owner ID", 400);
    }

    const language = await emFork.findOne(Language, {
      externalId: payload.language,
    });

    if (!language) {
      throw new AppError("Invalid Language ID", 400);
    }

    const timezone = await emFork.findOne(TimeZone, {
      externalId: payload.timezone,
    });

    if (!timezone) {
      throw new AppError("Invalid TimeZone ID", 400);
    }

    const client = new Client();

    client.owner_name = owner;
    client.language = language;
    client.timezone = timezone;

    client.userName = payload.userName;
    const hashedPassword = await hashPassword(payload.password);
    client.password = hashedPassword;
    client.companyName = payload.companyName;
    client.name = payload.name;
    client.email = payload.email;
    client.phone = payload.phone;
    client.address = payload.address;

    client.domain = payload.domain;
    client.vehicle_count = payload.vehicle_count;

    // Image path controller se aayega
    client.clientImage = payload.clientImage;

    client.status = payload.status ?? Status.ACTIVE;
    client.reason = payload.reason;

    const user = new User();
    user.externalId = client.externalId;
    user.userName = client.userName;
    user.password = hashedPassword;
    user.userType = UserType.CLIENT;
    user.companyName = client.companyName;
    user.name = client.name;
    user.email = client.email;
    user.phone = client.phone === undefined ? undefined : String(client.phone);
    user.address = client.address;
    user.companyAddress = client.address;
    user.owner = owner;
    user.language = language;
    user.timezone = timezone;
    user.domain = client.domain;
    user.vehicleCount = client.vehicle_count;
    user.clientImage = client.clientImage;
    user.imeiNumber = payload.imeiNumber;
    user.status = client.status;
    user.reason = client.reason;

    const created = await this.clientRepository.createClient(client, user);

    return created;
  }

  async updateClient(
    externalId: string,
    payload: UpdateClientDto,
  ): Promise<Client> {
    const emFork = this.em.fork();

    const client = await emFork.findOne(Client, {
      externalId,
      isDeleted: false,
    });

    if (!client) {
      throw new AppError("Client not found", 404);
    }

    const unifiedUser = await emFork.findOne(User, {
      externalId,
      isDeleted: false,
    });
    if (!unifiedUser) {
      throw new AppError("Unified Client account not found", 404);
    }

    if (payload.password !== undefined) {
      if (!payload.password || payload.password !== payload.confirmPassword) {
        throw new AppError("Password and Confirm Password do not match", 400);
      }
      const passwordHash = await hashPassword(payload.password);
      client.password = passwordHash;
      unifiedUser.password = passwordHash;
    } else if (payload.confirmPassword !== undefined) {
      throw new AppError("Password is required with confirmPassword", 400);
    }

    if (payload.userName !== undefined) {
      client.userName = payload.userName;
      unifiedUser.userName = payload.userName;
    }

    if (payload.companyName !== undefined) {
      client.companyName = payload.companyName;
      unifiedUser.companyName = payload.companyName;
    }

    if (payload.name !== undefined) {
      client.name = payload.name;
      unifiedUser.name = payload.name;
      unifiedUser.contactPersonName = payload.name;
    }

    if (payload.email !== undefined) {
      client.email = payload.email;
      unifiedUser.email = payload.email;
    }

    if (payload.phone !== undefined) {
      client.phone = payload.phone;
      unifiedUser.phone = String(payload.phone);
    }

    if (payload.address !== undefined) {
      client.address = payload.address;
      unifiedUser.address = payload.address;
      unifiedUser.companyAddress = payload.address;
    }

    if (payload.domain !== undefined) {
      client.domain = payload.domain;
      unifiedUser.domain = payload.domain;
    }

    if (payload.vehicle_count !== undefined) {
      client.vehicle_count = payload.vehicle_count;
      unifiedUser.vehicleCount = payload.vehicle_count;
    }

    if (payload.status !== undefined) {
      client.status = payload.status;
      unifiedUser.status = payload.status;
    }

    if (payload.reason !== undefined) {
      client.reason = payload.reason;
      unifiedUser.reason = payload.reason;
    }

    if (payload.clientImage !== undefined) {
      client.clientImage = payload.clientImage;
      unifiedUser.clientImage = payload.clientImage;
    }

    client.updatedAt = new Date();
    unifiedUser.updatedAt = client.updatedAt;

    await emFork.flush();

    return client;
  }

  async deleteClient(externalId: string): Promise<void> {
    const client = await this.clientRepository.getClientById(externalId);
    if (!client) {
      throw new AppError("Client not found", 404);
    }

    await this.clientRepository.deleteClient(externalId);
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
}
