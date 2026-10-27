
import { inject, injectable } from "tsyringe";
import { EntityManager } from "@mikro-orm/mysql";

import { ITransporterService } from "./interfaces/ITransporterService";
import { ITransporterRepository } from "../domain/repositories/mysql/ITranporterRepository";
import { CreateTransporterDto, updateTransporterDto } from "../domain/dto/TransporterDto";
import { Transporter } from "../domain/entities/mysql/Transporter";
import { Language } from "../domain/entities/mysql/Language";
import { TimeZone } from "../domain/entities/mysql/TimeZone";
import { Client } from "../domain/entities/mysql/Client";
import { InactiveTime } from "../domain/enums/InactiveTime";
import { AppError } from "../utils/errors";

@injectable()
export class TransporterService implements ITransporterService {
    constructor(
        @inject("ITransporterRepository")
        private readonly transporterRepository: ITransporterRepository,

        @inject(EntityManager)
        private readonly em: EntityManager,
    ) { }

    async getTransporter(): Promise<any[]> {
        const transporter = await this.transporterRepository.getTransporter();

        return transporter.map((transporter) => ({
            id: transporter.externalId,
            client: transporter.client?.name,
            language: transporter.language?.languageName,
            timezone: transporter.timezone?.timeZone,
            inactiveTime: transporter.inactiveTime,
            userName: transporter.userName,
            subscriptionStartDate: transporter.subscriptionStartDate ?? null,
            subscriptionDueDate: transporter.subscriptionDueDate ?? null,
            subscriptionExtendDate: transporter.subscriptionExtendDate ?? null,
            subscriptionExpiryCount: transporter.subscriptionExpiryCount ?? null,
            maximumRadiusForNearestPOI: transporter.maximumRadiusForNearestPOI ?? null,
            minimumDistanceForAddress: transporter.minimumDistanceForAddress ?? null,
            dataRestriction: transporter.dataRestriction ?? null,
            password: transporter.password,
            companyName: transporter.companyName,
            name: transporter.name,
            email: transporter.email,
            phone: transporter.phone,
            address: transporter.address,
            status: transporter.status,
            reason: transporter.reason ?? null,
            createdAt: transporter.createdAt,
            updatedAt: transporter.updatedAt,
        }));
    }

    async getTransporterById(externalId: string): Promise<any | null> {
        const transporter = await this.transporterRepository.getTransporterById(externalId);

        if (!transporter) {
            throw new AppError(
                "Transporter not found",
                404,
                null
            );
        }

        return {
            id: transporter.externalId,
            client: transporter.client?.name,
            language: transporter.language?.languageName,
            timezone: transporter.timezone?.timeZone,
            inactiveTime: transporter.inactiveTime,
            userName: transporter.userName,
            subscriptionStartDate: transporter.subscriptionStartDate ?? null,
            subscriptionDueDate: transporter.subscriptionDueDate ?? null,
            subscriptionExtendDate: transporter.subscriptionExtendDate ?? null,
            subscriptionExpiryCount: transporter.subscriptionExpiryCount ?? null,
            maximumRadiusForNearestPOI: transporter.maximumRadiusForNearestPOI ?? null,
            minimumDistanceForAddress: transporter.minimumDistanceForAddress ?? null,
            dataRestriction: transporter.dataRestriction ?? null,
            password: transporter.password,
            companyName: transporter.companyName,
            name: transporter.name,
            email: transporter.email,
            phone: transporter.phone,
            address: transporter.address,
            status: transporter.status,
            reason: transporter.reason ?? null,
            createdAt: transporter.createdAt,
            updatedAt: transporter.updatedAt,
        };
    }

    async createTransporter(
        dto: CreateTransporterDto,
    ): Promise<Transporter> {
        const em = this.em.fork();

        // Fetch Client by externalId
        const client = await em.findOne(Client, {
            externalId: dto.client,
        });

        if (!client) {
            throw new AppError("Client not found", 404, null);
        }

        const language = await em.findOne(Language, {
            externalId: dto.language,
        });

        if (!language) {
            throw new Error("Language not found");
        }

        const timezone = await em.findOne(TimeZone, {
            externalId: dto.timezone,
        });

        if (!timezone) {
            throw new Error("Timezone not found");
        }

        const transporter = new Transporter();

        transporter.userName = dto.userName;
        transporter.password = dto.password;
        transporter.companyName = dto.companyName;

        transporter.client = client;
        transporter.language = language;
        transporter.timezone = timezone;

        transporter.phone = dto.phone;
        transporter.name = dto.name;
        transporter.email = dto.email;
        transporter.address = dto.address;

        transporter.status = dto.status ?? transporter.status;
        transporter.inactiveTime =
            dto.inactiveTime ?? transporter.inactiveTime;
        transporter.reason = dto.reason;

        transporter.subscriptionStartDate = dto.subscriptionStartDate
            ? new Date(dto.subscriptionStartDate)
            : undefined;

        transporter.subscriptionDueDate = dto.subscriptionDueDate
            ? new Date(dto.subscriptionDueDate)
            : undefined;

        if (!dto.subscriptionExtendDate) {
            throw new Error("Subscription extend date is required");
        }

        transporter.subscriptionExtendDate = new Date(
            dto.subscriptionExtendDate,
        );

        transporter.subscriptionExpiryCount =
            dto.subscriptionExpiryCount;

        transporter.maximumRadiusForNearestPOI =
            dto.maximumRadiusForNearestPOI;

        transporter.minimumDistanceForAddress =
            dto.minimumDistanceForAddress;

        transporter.dataRestriction = dto.dataRestriction;

        return await this.transporterRepository.createTransporter(
            transporter,
        );
    }


    async updateTransporter(
        externalId: string,
        dto: Partial<CreateTransporterDto>,
    ): Promise<Transporter> {
        const em = this.em.fork();

        const existing = await this.transporterRepository.getTransporterById(
            externalId,
        );

        if (!existing) {
            throw new AppError("Transporter not found", 404, null);
        }

        // Validate password only when a new password is provided
        if (dto.password && dto.password !== dto.confirmPassword) {
            throw new AppError(
                "Password and confirm password do not match",
                400,
                null,
            );
        }

        if (dto.client) {
            const client = await em.findOne(Client, {
                externalId: dto.client,
            });

            if (!client) {
                throw new AppError("Client not found", 404, null);
            }

            existing.client = client;
        }

        if (dto.language) {
            const language = await em.findOne(Language, {
                externalId: dto.language,
            });

            if (!language) {
                throw new AppError("Language not found", 404, null);
            }

            existing.language = language;
        }

        if (dto.timezone) {
            const timezone = await em.findOne(TimeZone, {
                externalId: dto.timezone,
            });

            if (!timezone) {
                throw new AppError("Timezone not found", 404, null);
            }

            existing.timezone = timezone;
        }

        if (dto.userName !== undefined) {
            existing.userName = dto.userName;
        }

        if (dto.companyName !== undefined) {
            existing.companyName = dto.companyName;
        }

        if (dto.name !== undefined) {
            existing.name = dto.name;
        }

        if (dto.email !== undefined) {
            existing.email = dto.email;
        }

        if (dto.phone !== undefined) {
            existing.phone = dto.phone;
        }

        if (dto.address !== undefined) {
            existing.address = dto.address;
        }

        if (dto.status !== undefined) {
            existing.status = dto.status;
        }

        if (dto.inactiveTime !== undefined) {
            existing.inactiveTime = dto.inactiveTime;
        }

        if (dto.reason !== undefined) {
            existing.reason = dto.reason;
        }

        if (dto.subscriptionStartDate !== undefined) {
            existing.subscriptionStartDate = dto.subscriptionStartDate
                ? new Date(dto.subscriptionStartDate)
                : undefined;
        }

        if (dto.subscriptionDueDate !== undefined) {
            existing.subscriptionDueDate = dto.subscriptionDueDate
                ? new Date(dto.subscriptionDueDate)
                : undefined;
        }

        if (dto.subscriptionExtendDate !== undefined) {
            if (!dto.subscriptionExtendDate) {
                throw new AppError(
                    "Subscription extend date cannot be empty",
                    400,
                    null,
                );
            }

            existing.subscriptionExtendDate = new Date(
                dto.subscriptionExtendDate,
            );
        }

        if (dto.subscriptionExpiryCount !== undefined) {
            existing.subscriptionExpiryCount = dto.subscriptionExpiryCount;
        }

        if (dto.maximumRadiusForNearestPOI !== undefined) {
            existing.maximumRadiusForNearestPOI =
                dto.maximumRadiusForNearestPOI;
        }

        if (dto.minimumDistanceForAddress !== undefined) {
            existing.minimumDistanceForAddress =
                dto.minimumDistanceForAddress;
        }

        if (dto.dataRestriction !== undefined) {
            existing.dataRestriction = dto.dataRestriction;
        }

        if (dto.password) {
            existing.password = dto.password;
        }

        await this.transporterRepository.updateTransporter(existing);

        return existing;
    }

    async deleteTransporter(externalId: string): Promise<void> {
    const transporter = await this.transporterRepository.getTransporterById(externalId);
    if (!transporter) {
      throw new AppError("Transporter not found", 404);
    }
    
    await this.transporterRepository.deleteTransporter(externalId);
  }
}
