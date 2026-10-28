import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { AddGroup } from "../../../../domain/entities/mysql/AddGroup";
import { Client } from "../../../../domain/entities/mysql/Client";
import { IAddGroupRepository } from "../../../../domain/repositories/mysql/IAddGroupRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class AddGroupRepository implements IAddGroupRepository {
  constructor(private readonly em: EntityManager) {}

  async getAddGroups(): Promise<AddGroup[]> {
    return this.em
      .fork()
      .find(AddGroup, { isDeleted: false });
  }

  async getAddGroupById(externalId: string): Promise<AddGroup | null> {
    return this.em.fork().findOne(AddGroup, { externalId, isDeleted: false });
  }

  async createAddGroup(addGroup: AddGroup): Promise<AddGroup> {
    const em = this.em.fork();
    if (addGroup.createdBy) {
      addGroup.createdBy = em.getReference(Client, addGroup.createdBy.id);
    }
    await em.persistAndFlush(addGroup);
    return addGroup;
  }

  async updateAddGroup(addGroup: AddGroup): Promise<AddGroup> {
    const em = this.em.fork();
    const existing = await em.findOne(AddGroup, {
      externalId: addGroup.externalId,
      isDeleted: false,
    });

    if (!existing) {
      throw new AppError("Add group not found", 404);
    }

    em.assign(existing, {
      groupName: addGroup.groupName,
      assignedTo: addGroup.assignedTo,
      status: addGroup.status,
      reason: addGroup.reason,
      ...(addGroup.updatedBy
        ? { updatedBy: em.getReference(Client, addGroup.updatedBy.id) }
        : {}),
    });
    await em.flush();
    return existing;
  }

  async deleteAddGroup(externalId: string, deletedBy?: Client): Promise<void> {
    const em = this.em.fork();
    const addGroup = await em.findOne(AddGroup, {
      externalId,
      isDeleted: false,
    });

    if (!addGroup) {
      throw new AppError("Add group not found", 404);
    }

    addGroup.isDeleted = true;
    if (deletedBy) {
      addGroup.deletedBy = em.getReference(Client, deletedBy.id);
    }
    addGroup.updatedAt = new Date();
    await em.flush();
  }
}
