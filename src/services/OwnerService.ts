import { inject, injectable } from "tsyringe";
import { IOwnerService } from "./interfaces/IOwnerService";
import { IOwnerRepository } from "../domain/repositories/mysql/IOwnerRepository";
import { CreateOwnerDto, UpdateOwnerDto } from "../domain/dto/OwnerDto";
import { Owner } from "../domain/entities/mysql/Owner";
import { AppError } from "../utils/errors";

@injectable()
export class OwnerService implements IOwnerService {
    constructor(
        @inject("IOwnerRepository")
        private readonly ownerRepository: IOwnerRepository
    ) { }

    async getOwner() {
        const owner = await this.ownerRepository.getOwner();

        return owner.map((owner) => ({
            id: owner.externalId,
            ownerName: owner.ownerName,
            status: owner.status,
            reason: owner.reason
        }))
    }


    async getOwnerById(externalId: string) {
        const owner = await this.ownerRepository.getOwnerById(externalId);

        if (!owner) {
            throw new AppError(
                "Owner not found",
                404,
                null
            );
        }

        return {
            id: owner.externalId,
            ownerName: owner.ownerName,
            status: owner.status,
            reason: owner.reason
        }
    }

    async createOwner(
        dto: CreateOwnerDto,
        ownerId: string
    ): Promise<Owner> {

        const owner = new Owner();

        owner.ownerName = dto.ownerName;

        return await this.ownerRepository.createOwner(owner);
    }

    async updateOwner(
        externalId: string,
        payload: UpdateOwnerDto,
    ): Promise<Owner> {

        const owner = await this.ownerRepository.getOwnerById(externalId);

        if (!owner) {
            throw new AppError("owner not found", 404);
        }

        if (payload.ownerName !== undefined) {
            owner.ownerName = payload.ownerName;
        }

        owner.updatedAt = new Date();

        return await this.ownerRepository.updateOwner(owner);
    }

     async deleteOwner(externalId:string): Promise<void> {
    const owner = await this.ownerRepository.getOwnerById(externalId);
    if (!owner) {
      throw new AppError("Owner not found", 404);
    }
    // assertRoleCanBeMutated(role.id);
    await this.ownerRepository.deleteOwner(externalId);
  }

}