import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { AddGroup } from "../../../../domain/entities/mysql/AddGroup";
import { AddVehicle } from "../../../../domain/entities/mysql/AddVehicle";
import { Client } from "../../../../domain/entities/mysql/Client";
import { Transporter } from "../../../../domain/entities/mysql/Transporter";
import { IAddGroupRepository } from "../../../../domain/repositories/mysql/IAddGroupRepository";
import { AppError } from "../../../../utils/errors";

const ADD_GROUP_POPULATE = ["vehicle", "transporter"] as const;

@injectable()
export class AddGroupRepository implements IAddGroupRepository {
  constructor(private readonly em: EntityManager) {}

  async getAddGroups(): Promise<AddGroup[]> {
    return this.em.fork().find(
      AddGroup,
      { isDeleted: false },
      { populate: [...ADD_GROUP_POPULATE] },
    );
  }

  async getAddGroupById(externalId: string): Promise<AddGroup | null> {
    return this.em.fork().findOne(
      AddGroup,
      { externalId, isDeleted: false },
      { populate: [...ADD_GROUP_POPULATE] },
    );
  }

  async createAddGroup(addGroup: AddGroup): Promise<AddGroup> {
    const em = this.em.fork();
    if (addGroup.createdBy) {
      addGroup.createdBy = em.getReference(Client, addGroup.createdBy.id);
    }
    if (addGroup.vehicle) {
      addGroup.vehicle = em.getReference(AddVehicle, addGroup.vehicle.id);
    }
    if (addGroup.transporter) {
      addGroup.transporter = em.getReference(
        Transporter,
        addGroup.transporter.id,
      );
    }
    await em.persistAndFlush(addGroup);
    await em.populate(addGroup, [...ADD_GROUP_POPULATE]);
    return addGroup;
  }

  async updateAddGroup(addGroup: AddGroup): Promise<AddGroup> {
    const em = this.em.fork();
    const existing = await em.findOne(
      AddGroup,
      {
        externalId: addGroup.externalId,
        isDeleted: false,
      },
      { populate: [...ADD_GROUP_POPULATE] },
    );

    if (!existing) {
      throw new AppError("Add group not found", 404);
    }

    em.assign(existing, {
      groupName: addGroup.groupName,
      assignedTo: addGroup.assignedTo,
      vehicle: addGroup.vehicle
        ? em.getReference(AddVehicle, addGroup.vehicle.id)
        : null,
      transporter: addGroup.transporter
        ? em.getReference(Transporter, addGroup.transporter.id)
        : null,
      status: addGroup.status,
      reason: addGroup.reason,
      ...(addGroup.updatedBy
        ? { updatedBy: em.getReference(Client, addGroup.updatedBy.id) }
        : {}),
    });
    await em.flush();
    await em.populate(existing, [...ADD_GROUP_POPULATE]);
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
