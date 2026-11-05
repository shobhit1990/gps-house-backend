import { GeofType } from "../../entities/mysql/GeofType";

export interface IGeofTypeRepository {

    getGeofType():Promise<GeofType[]>;

    getGeofTypeById(externalId:string): Promise<GeofType | null>;

    createGeofType(geofType: GeofType): Promise<GeofType>;

    updateGeofType(geofType: GeofType): Promise<GeofType>;

    deleteGeofType(externalId:string): Promise<void>;
}