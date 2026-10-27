import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateAddGroupDto,
  UpdateAddGroupDto,
} from "../domain/dto/AddGroupDto";
import { AddGroup } from "../domain/entities/mysql/AddGroup";
import { Client } from "../domain/entities/mysql/Client";
import { Status } from "../domain/enums/status";
import { IAddGroupRepository } from "../domain/repositories/mysql/IAddGroupRepository";
import { AppError } from "../utils/errors";
import {
  AddGroupResponse,
  IAddGroupService,
} from "./interfaces/IAddGroupService";

@injectable()
export class AddGroupService implements IAddGroupService {
  constructor(
    @inject("IAddGroupRepository")
    private readonly addGroupRepository: IAddGroupRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getAddGroups(): Promise<AddGroupResponse[]> {
    const addGroups = await this.addGroupRepository.getAddGroups();
    return addGroups.map((addGroup) => this.toResponse(addGroup));
  }

  async getAddGroupById(externalId: string): Promise<AddGroupResponse> {
    const addGroup = await this.addGroupRepository.getAddGroupById(externalId);
    if (!addGroup) {
      throw new AppError("Add group not found", 404);
    }
    return this.toResponse(addGroup);
  }

  async createAddGroup(
    payload: CreateAddGroupDto,
    actorUserId?: number,
  ): Promise<AddGroupResponse> {
    const actor = await this.findActor(actorUserId);
    const addGroup = new AddGroup();
    addGroup.groupName = payload.groupName;
    addGroup.assignedTo = payload.assignedTo;
    addGroup.status = payload.status ?? Status.ACTIVE;
    addGroup.reason = payload.reason;
    addGroup.createdBy = actor;

    return this.toResponse(
      await this.addGroupRepository.createAddGroup(addGroup),
    );
  }

  async updateAddGroup(
    externalId: string,
    payload: UpdateAddGroupDto,
    actorUserId?: number,
  ): Promise<AddGroupResponse> {
    const addGroup = await this.addGroupRepository.getAddGroupById(externalId);
    if (!addGroup) {
      throw new AppError("Add group not found", 404);
    }

    const actor = await this.findActor(actorUserId);
    if (actor) addGroup.updatedBy = actor;
    if (payload.groupName !== undefined) addGroup.groupName = payload.groupName;
    if (payload.assignedTo !== undefined) {
      addGroup.assignedTo = payload.assignedTo;
    }
    if (payload.status !== undefined) addGroup.status = payload.status;
    if (payload.reason !== undefined) addGroup.reason = payload.reason;

    return this.toResponse(
      await this.addGroupRepository.updateAddGroup(addGroup),
    );
  }

  async deleteAddGroup(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.addGroupRepository.deleteAddGroup(externalId, actor);
  }

  private async findActor(userId?: number): Promise<Client | undefined> {
    if (userId === undefined) return undefined;
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new AppError("Invalid user ID", 401);
    }

    const actor = await this.em.fork().findOne(Client, {
      id: userId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!actor) {
      throw new AppError("User not found", 401);
    }
    return actor;
  }

  private toResponse(addGroup: AddGroup): AddGroupResponse {
    return {
      id: addGroup.externalId,
      groupName: addGroup.groupName,
      assignedTo: addGroup.assignedTo,
      status: addGroup.status ?? null,
      reason: addGroup.reason ?? null,
      createdAt: addGroup.createdAt,
      updatedAt: addGroup.updatedAt,
    };
  }
}
