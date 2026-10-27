import { Owner } from "../../entities/mysql/Owner";

export interface IOwnerRepository {

    getOwner():Promise<Owner[]>;

    getOwnerById(externalId:string): Promise<Owner | null>;

    createOwner(owner: Owner): Promise<Owner>;

    updateOwner(owner: Owner): Promise<Owner>;

    deleteOwner(externalId:string): Promise<void>;
}