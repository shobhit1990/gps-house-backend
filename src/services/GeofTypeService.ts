import { inject, injectable } from "tsyringe";
import { IGeofTypeService } from "./interfaces/IGeofTypeService";
import { IGeofTypeRepository } from "../domain/repositories/mysql/IGeofTypeRepository";
import { AppError } from "../utils/errors";
import { CreatGeofTypeDto, UpdateGeofTypeDto } from "../domain/dto/GeofTypeDto";
import { GeofType } from "../domain/entities/mysql/GeofType";

@injectable()
export class GeofTypeService implements IGeofTypeService {
    constructor(
        @inject("IGeofTypeRepository")
        private readonly geofTypeRepository: IGeofTypeRepository
    ) { }

    async getGeofType() {
        const type = await this.geofTypeRepository.getGeofType();

        return type.map((type) => ({
            id: type.externalId,
            geofType: type.geofType,
            status: type.status,
            reason: type.reason
        }))
    }

    async getGeofTypeById(externalId: string) {
        const type = await this.geofTypeRepository.getGeofTypeById(externalId);

        if (!type) {
            throw new AppError(
                "type not found",
                404,
                null
            );
        }

        return {
            id: type.externalId,
            geofType: type.geofType,
            status: type.status,
            reason: type.reason
        }
    }


    async createGeofType(
        dto: CreatGeofTypeDto,
        ownerId: string
    ): Promise<GeofType> {

        const geofType = new GeofType();

        geofType.geofType = dto.geofType;

        return await this.geofTypeRepository.createGeofType(geofType);
    }

    async updateGeofType(
        externalId: string,
        payload: UpdateGeofTypeDto,
    ): Promise<GeofType> {

        const geofType = await this.geofTypeRepository.getGeofTypeById(externalId);

        if (!geofType) {
            throw new AppError("geofType not found", 404);
        }

        if (payload.geofType !== undefined) {
            geofType.geofType = payload.geofType;
        }
        if (payload.status !== undefined) {
            geofType.status = payload.status;
        }
        if (payload.reason !== undefined) {
            geofType.reason = payload.reason;
        }

        geofType.updatedAt = new Date();

        return await this.geofTypeRepository.updateGeofType(geofType);
    }

    async deleteGeofType(externalId: string): Promise<void> {
        const deta = await this.geofTypeRepository.getGeofTypeById(externalId);
        if (!deta) {
            throw new AppError("Type not found", 404);
        }

        await this.geofTypeRepository.deleteGeofType(externalId);
    }
}