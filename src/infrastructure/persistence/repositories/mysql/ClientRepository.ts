
import { injectable } from "tsyringe";
import { IClientRepository } from "../../../../domain/repositories/mysql/IClientRepository";
import { EntityManager } from "@mikro-orm/mysql";
import { FormError } from "../../../../domain/dto/FormError";
import { AppError } from "../../../../utils/errors";
import { Client } from "../../../../domain/entities/mysql/Client";


@injectable()
export class ClientRepository implements IClientRepository {
    constructor(private readonly em: EntityManager) { }


    async getClientByUsername(
        userName: string
    ): Promise<Client | null> {
        const emFork = this.em.fork();

        return await emFork.findOne(Client, {
            userName: userName.trim(),
            isDeleted: false,
        });
    }

    async getClient(): Promise<Client[]> {
        const emFork = this.em.fork();
        const clientData = await emFork.find(Client, { isDeleted: false }, { populate: ["createdBy", "owner_name", "language", "timezone"] });
        return clientData;
    }

    async getClientById(externalId: string): Promise<Client | null> {
        const emFork = this.em.fork();
        return await emFork.findOne(Client, {
            externalId: externalId,
            isDeleted: false,
        }, { populate: ["createdBy", "owner_name", "language", "timezone"], });
    }


    async createClient(client: Client): Promise<Client> {
        const emFork = this.em.fork();

        emFork.persist(client);

        try {
            await emFork.flush();

        } catch (err: unknown) {
            const current = err as {
                code?: string;
                errno?: number;
                message?: string;
                sqlMessage?: string;
            };

            const text = [
                current.sqlMessage,
                current.message,
            ].filter(Boolean).join(" ");

            const isDuplicate =
                current.code === "ER_DUP_ENTRY" ||
                current.errno === 1062 ||
                /duplicate entry/i.test(text);

            if (isDuplicate) {
                const error = new FormError();

                if (/client_user_name_unique/i.test(text)) {
                    error.field = "userName";
                    error.message = "Username already exists";
                } else if (/client_email_unique/i.test(text)) {
                    error.field = "email";
                    error.message = "Email already exists";
                } else if (/client_phone_unique/i.test(text)) {
                    error.field = "phone";
                    error.message = "Phone already exists";
                } else if (/client_external_id_unique/i.test(text)) {
                    error.field = "id";
                    error.message = "Client ID already exists";
                } else {
                    error.field = "general";
                    error.message = "Duplicate value already exists";
                }

                throw new AppError(
                    "Validation failed. Please check the errors and try again.",
                    400,
                    null,
                    [error]
                );
            }

            throw err;
        }


        return client;
    }
    async updateClient(client: Client): Promise<Client> {
        const emFork = this.em.fork();

        const existing = await emFork.findOne(Client, {
            externalId: client.externalId,
            isDeleted: false,
        });

        if (!existing) {
            throw new AppError("Client not found", 404);
        }

        emFork.assign(existing, {
            userName: client.userName,
            companyName: client.companyName,
            name: client.name,
            email: client.email,
            phone: client.phone,
            address: client.address,
            domain: client.domain,
            vehicle_count: client.vehicle_count,
            clientImage: client.clientImage,
            status: client.status,
            reason: client.reason,
            password: client.password,
            owner_name: client.owner_name,
            language: client.language,
            timezone: client.timezone,
            updatedAt: new Date(),
        });

        await emFork.flush();

        return existing;
    }

    async deleteClient(externalId: string): Promise<void> {
        const emFork = this.em.fork();

        const client = await emFork.findOne(Client, { externalId });

        if (!client) {
            throw new AppError("Client not found", 404);
        }

        client.isDeleted = true;

        await emFork.persistAndFlush(client);

    }
}
