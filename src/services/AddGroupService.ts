import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateAddGroupDto,
  UpdateAddGroupDto,
} from "../domain/dto/AddGroupDto";
import { AddGroup } from "../domain/entities/mysql/AddGroup";
import { AddVehicle } from "../domain/entities/mysql/AddVehicle";
import { Client } from "../domain/entities/mysql/Client";
import { User } from "../domain/entities/mysql/User";
import { Transporter } from "../domain/entities/mysql/Transporter";
import { Status } from "../domain/enums/status";
import { Type } from "../domain/enums/Type";
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
    const assignment = await this.resolveAssignment(
      payload.assignedTo,
      payload.vehicle,
      payload.transporter,
    );

    const addGroup = new AddGroup();
    addGroup.groupName = payload.groupName;
    addGroup.assignedTo = payload.assignedTo;
    addGroup.vehicle = assignment.vehicle;
    addGroup.transporter = assignment.transporter;
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
    if (payload.status !== undefined) addGroup.status = payload.status;
    if (payload.reason !== undefined) addGroup.reason = payload.reason;

    const nextAssignedTo = payload.assignedTo ?? addGroup.assignedTo;
    const assignmentTouched =
      payload.assignedTo !== undefined ||
      payload.vehicle !== undefined ||
      payload.transporter !== undefined;

    if (assignmentTouched) {
      const vehicleId =
        payload.vehicle ??
        (nextAssignedTo === Type.VEHICLE
          ? addGroup.vehicle?.externalId
          : undefined);
      const transporterId =
        payload.transporter ??
        (nextAssignedTo === Type.TRANSPORTER
          ? addGroup.transporter?.externalId
          : undefined);

      if (nextAssignedTo === Type.VEHICLE && !vehicleId) {
        throw new AppError(
          "vehicle is required when assignedTo is vehicle",
          400,
        );
      }
      if (nextAssignedTo === Type.TRANSPORTER && !transporterId) {
        throw new AppError(
          "transporter is required when assignedTo is transporter",
          400,
        );
      }

      const assignment = await this.resolveAssignment(
        nextAssignedTo,
        vehicleId,
        transporterId,
      );
      addGroup.assignedTo = nextAssignedTo;
      addGroup.vehicle = assignment.vehicle;
      addGroup.transporter = assignment.transporter;
    }

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

  private async resolveAssignment(
    assignedTo: Type,
    vehicleExternalId?: string,
    transporterExternalId?: string,
  ): Promise<{
    vehicle: AddVehicle | null;
    transporter: Transporter | null;
  }> {
    if (assignedTo === Type.VEHICLE) {
      if (!vehicleExternalId?.trim()) {
        throw new AppError(
          "vehicle is required when assignedTo is vehicle",
          400,
        );
      }
      const vehicle = await this.em.fork().findOne(AddVehicle, {
        externalId: vehicleExternalId.trim(),
        isDeleted: false,
      });
      if (!vehicle || vehicle.status === Status.INACTIVE) {
        throw new AppError("Selected vehicle was not found or is inactive", 400);
      }
      return { vehicle, transporter: null };
    }

    if (assignedTo === Type.TRANSPORTER) {
      if (!transporterExternalId?.trim()) {
        throw new AppError(
          "transporter is required when assignedTo is transporter",
          400,
        );
      }
      const transporter = await this.em.fork().findOne(Transporter, {
        externalId: transporterExternalId.trim(),
        isDeleted: false,
      });
      if (!transporter || transporter.status === Status.INACTIVE) {
        throw new AppError(
          "Selected transporter was not found or is inactive",
          400,
        );
      }
      return { vehicle: null, transporter };
    }

    throw new AppError(
      `assignedTo must be one of: ${Object.values(Type).join(", ")}`,
      400,
    );
  }

  /**
   * Auth gives `users.id`. Audit FKs point at `client`, so resolve via matching
   * externalId. Platform admins have no client row — createdBy/updatedBy stay unset.
   */
  private async findActor(userId?: number): Promise<Client | undefined> {
    if (userId === undefined) return undefined;
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new AppError("Invalid user ID", 401);
    }

    const em = this.em.fork();
    const authUser = await em.findOne(User, {
      id: userId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!authUser) {
      throw new AppError("User not found", 401);
    }

    return (
      (await em.findOne(Client, {
        externalId: authUser.externalId,
        isDeleted: false,
        status: Status.ACTIVE,
      })) ?? undefined
    );
  }

  private toResponse(addGroup: AddGroup): AddGroupResponse {
    return {
      id: addGroup.externalId,
      groupName: addGroup.groupName,
      assignedTo: addGroup.assignedTo,
      vehicle: addGroup.vehicle
        ? {
            id: addGroup.vehicle.externalId,
            name: addGroup.vehicle.vehicle ?? null,
          }
        : null,
      transporter: addGroup.transporter
        ? {
            id: addGroup.transporter.externalId,
            name:
              addGroup.transporter.companyName ??
              addGroup.transporter.name ??
              null,
          }
        : null,
      status: addGroup.status ?? null,
      reason: addGroup.reason ?? null,
      createdAt: addGroup.createdAt,
      updatedAt: addGroup.updatedAt,
    };
  }
}
