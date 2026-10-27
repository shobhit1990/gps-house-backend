import { CreateOwnerDto, UpdateOwnerDto } from "../../domain/dto/OwnerDto";
import { Owner } from "../../domain/entities/mysql/Owner";

export interface IOwnerService {

    getOwner(): Promise<any[]>;

    getOwnerById(externalId: string): Promise<any | null>;

    createOwner(
       dto: CreateOwnerDto, ownerId: string
    ): Promise<Owner>;

    updateOwner(
        externalId: string,
        payload: UpdateOwnerDto,
    ): Promise<Owner>;

    deleteOwner(externalId: string): Promise<void>;
}