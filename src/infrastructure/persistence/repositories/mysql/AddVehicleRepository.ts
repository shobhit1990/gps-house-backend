import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { AddVehicle } from "../../../../domain/entities/mysql/AddVehicle";
import { IAddVehicleRepository } from "../../../../domain/repositories/mysql/IAddVehicleRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class AddVehicleRepository implements IAddVehicleRepository {
    constructor(private readonly em: EntityManager) {}

    async getAddVehicle(): Promise<AddVehicle[]> {
        return this.em.fork().find(
            AddVehicle,
            { isDeleted: false },
            { populate: ["client", "transporter"], orderBy: { createdAt: "DESC" } },
        );
    }

    async getAddVehicleById(externalId: string): Promise<AddVehicle | null> {
        return this.em.fork().findOne(
            AddVehicle,
            { externalId, isDeleted: false },
            { populate: ["client", "transporter"] },
        );
    }

    async createAddVehicle(vehicle: AddVehicle): Promise<AddVehicle> {
        const em = this.em.fork();
        await em.persistAndFlush(vehicle);
        return vehicle;
    }

    async updateAddVehicle(vehicle: AddVehicle): Promise<AddVehicle> {
        const em = this.em.fork();
        const existing = await em.findOne(AddVehicle, {
            externalId: vehicle.externalId,
            isDeleted: false,
        });

        if (!existing) {
            throw new AppError("Vehicle not found", 404);
        }

        em.assign(existing, vehicle);
        await em.flush();
        return existing;
    }

    async deleteAddVehicle(externalId: string): Promise<void> {
        const em = this.em.fork();
        const vehicle = await em.findOne(AddVehicle, { externalId, isDeleted: false });

        if (!vehicle) {
            throw new AppError("Vehicle not found", 404);
        }

        vehicle.isDeleted = true;
        vehicle.updatedAt = new Date();
        await em.flush();
    }
}