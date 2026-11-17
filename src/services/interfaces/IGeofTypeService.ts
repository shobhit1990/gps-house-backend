import { CreatGeofTypeDto, UpdateGeofTypeDto } from "../../domain/dto/GeofTypeDto";
import { GeofType } from "../../domain/entities/mysql/GeofType";

export interface IGeofTypeService {

    getGeofType(): Promise<any[]>;

    getGeofTypeById(externalId: string): Promise<any | null>;

    createGeofType(
       dto: CreatGeofTypeDto, ownerId: string
    ): Promise<GeofType>;

    updateGeofType(
        externalId: string,
        payload: UpdateGeofTypeDto,
    ): Promise<GeofType>;

    deleteGeofType(externalId: string): Promise<void>;
}