import { injectable } from "tsyringe";
import { EntityManager } from "@mikro-orm/mysql";
import { IOwnerRepository } from "../../../../domain/repositories/mysql/IOwnerRepository";
import { Owner } from "../../../../domain/entities/mysql/Owner";
import { Status } from "../../../../domain/enums/status";
import { AppError } from "../../../../utils/errors";

@injectable()
export class OwnerRepository implements IOwnerRepository {
    constructor(private readonly em: EntityManager) { }

    async getOwner(): Promise<Owner[]> {
        const emFork = this.em.fork();
        const roleData = emFork.find(Owner, { isDeleted: false }, {});
        return roleData;
    }

    async getOwnerById(externalId: string): Promise<Owner | null> {
        const emFork = this.em.fork();
        return await emFork.findOne(Owner, {
            externalId: externalId,
            isDeleted: false,
        });
    }

    async createOwner(owner: Owner): Promise<Owner> {
        const emFork = this.em.fork();
        emFork.persist(owner);
        await emFork.flush();
        return owner;
    }

    async updateOwner(owner:Owner): Promise<Owner> {
        const emFork = this.em.fork();
        const existing = await emFork.findOne(Owner, { id: owner.id });
        if (!existing) {
          throw new AppError("role not found", 404);
        }

        existing.ownerName = owner.ownerName;
        existing.reason = owner.reason;
        existing.status = owner.status;
        existing.updatedAt = owner.updatedAt;
        existing.isDeleted = owner.isDeleted;
        existing.deletedAt = owner.deletedAt;

        await emFork.flush();
        return existing;
      }

    async deleteOwner(externalId:string): Promise<void> {
      const emFork = this.em.fork();
    
      const owner = await emFork.findOne(Owner, { externalId });
    
      if (!owner) {
        throw new AppError("owner not found", 404);
      }
    
      owner.isDeleted = true;
    
      await emFork.persistAndFlush(owner);
    
    }
}