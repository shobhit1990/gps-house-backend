import { injectable } from "tsyringe";
import { IGeofTypeRepository } from "../../../../domain/repositories/mysql/IGeofTypeRepository";
import { EntityManager } from "@mikro-orm/mysql";
import { GeofType } from "../../../../domain/entities/mysql/GeofType";
import { AppError } from "../../../../utils/errors";

@injectable()
export class GeofTypeRepository implements IGeofTypeRepository {
    constructor(private readonly em: EntityManager) { }

    async getGeofType(): Promise<GeofType[]> {
        const emFork = this.em.fork();
        const Data = emFork.find(GeofType, { isDeleted: false }, {});
        return Data;
    }

    async getGeofTypeById(externalId: string): Promise<GeofType | null> {
        const emFork = this.em.fork();
        return await emFork.findOne(GeofType, {
            externalId: externalId,
            isDeleted: false,
        });
    }

    async createGeofType(geofType: GeofType): Promise<GeofType> {
        const emFork = this.em.fork();
        emFork.persist(geofType);
        await emFork.flush();
        return geofType;
    }

    async updateGeofType(geofType: GeofType): Promise<GeofType> {
        const emFork = this.em.fork();

        const existing = await emFork.findOne(GeofType, {
            id: geofType.id,
            isDeleted: false,
        });

        if (!existing) {
            throw new AppError("GeofType not found", 404);
        }

        existing.geofType = geofType.geofType;
        existing.reason = geofType.reason;
        existing.status = geofType.status;
        existing.updatedAt = geofType.updatedAt;

        await emFork.flush();
        return existing;
    }


    async deleteGeofType(externalId: string): Promise<void> {
        const emFork = this.em.fork();

        const deta = await emFork.findOne(GeofType, { externalId });

        if (!deta) {
            throw new AppError("Type not found", 404);
        }

        deta.isDeleted = true;

        await emFork.persistAndFlush(deta);

    }
}