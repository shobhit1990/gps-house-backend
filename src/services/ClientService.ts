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

@injectable()
export class ClientService implements IClientService {
    constructor(
        @inject("IClientRepository")
        private readonly clientRepository: IClientRepository,

        @inject(EntityManager)
        private readonly em: EntityManager,

    ) { }

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
            throw new AppError(
                "client not found",
                404,
                null
            );
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
        }
    }

    async createClient(payload: CreateClientDto): Promise<Client> {
        // 1. Check duplicate username

        const existingUsername =
            await this.clientRepository.getClientByUsername(
                payload.userName.trim()
            );

        if (existingUsername) {
            const error = new FormError();
            error.field = "userName";
            error.message = "Username already exists";

            throw new AppError(
                "Validation failed. Please check the errors and try again.",
                400,
                null,
                [error]
            );
        }

        if (payload.password !== payload.confirmPassword) {
            throw new AppError(
                "Password and Confirm Password do not match",
                400
            );
        }

        const emFork = this.em.fork();

        const owner = await emFork.findOne(Owner, {
            externalId: payload.owner_name
        });

        if (!owner) {
            throw new AppError("Invalid Owner ID", 400);
        }

        const language = await emFork.findOne(Language, {
            externalId: payload.language
        });

        if (!language) {
            throw new AppError("Invalid Language ID", 400);
        }

        const timezone = await emFork.findOne(TimeZone, {
            externalId: payload.timezone
        });

        if (!timezone) {
            throw new AppError("Invalid TimeZone ID", 400);
        }

        const client = new Client();

        client.owner_name = owner;
        client.language = language;
        client.timezone = timezone;

        client.userName = payload.userName;
        client.password = payload.password;
        client.companyName = payload.companyName;
        client.name = payload.name;
        client.email = payload.email;
        client.phone = payload.phone;
        client.address = payload.address;

        client.domain = payload.domain;
        client.vehicle_count = payload.vehicle_count;

        // Image path controller se aayega
        client.clientImage = payload.clientImage;

        client.status = payload.status!;
        client.reason = payload.reason;

        const created =
            await this.clientRepository.createClient(client);

        return created;
    }

    async updateClient(
    externalId: string,
    payload: UpdateClientDto
): Promise<Client> {
    const emFork = this.em.fork();

    const client = await emFork.findOne(Client, {
        externalId,
        isDeleted: false,
    });

    if (!client) {
        throw new AppError("Client not found", 404);
    }

    if (payload.userName !== undefined) {
        client.userName = payload.userName;
    }

    if (payload.companyName !== undefined) {
        client.companyName = payload.companyName;
    }

    if (payload.name !== undefined) {
        client.name = payload.name;
    }

    if (payload.email !== undefined) {
        client.email = payload.email;
    }

    if (payload.phone !== undefined) {
        client.phone = payload.phone;
    }

    if (payload.address !== undefined) {
        client.address = payload.address;
    }

    if (payload.domain !== undefined) {
        client.domain = payload.domain;
    }

    if (payload.vehicle_count !== undefined) {
        client.vehicle_count = payload.vehicle_count;
    }

    if (payload.status !== undefined) {
        client.status = payload.status;
    }

    if (payload.reason !== undefined) {
        client.reason = payload.reason;
    }

    if (payload.clientImage !== undefined) {
        client.clientImage = payload.clientImage;
    }

    client.updatedAt = new Date();

    await emFork.flush();

    return client;
}

    async deleteClient(externalId: string): Promise<void> {
    const client = await this.clientRepository.getClientById(externalId);
    if (!client) {
      throw new AppError("Client not found", 404);
    }
    
    await this.clientRepository.deleteClient(externalId);
  }

}