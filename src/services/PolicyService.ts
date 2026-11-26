import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import { CreatePolicyDto, UpdatePolicyDto } from "../domain/dto/PolicyDto";
import { Client } from "../domain/entities/mysql/Client";
import { User } from "../domain/entities/mysql/User";
import { Policy } from "../domain/entities/mysql/Policy";
import { Status } from "../domain/enums/status";
import { IPolicyRepository } from "../domain/repositories/mysql/IPolicyRepository";
import { AppError } from "../utils/errors";
import { IPolicyService, PolicyResponse } from "./interfaces/IPolicyService";

@injectable()
export class PolicyService implements IPolicyService {
  constructor(
    @inject("IPolicyRepository")
    private readonly policyRepository: IPolicyRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getPolicies(): Promise<PolicyResponse[]> {
    const policies = await this.policyRepository.getPolicies();
    return policies.map((policy) => this.toResponse(policy));
  }

  async getPolicyById(externalId: string): Promise<PolicyResponse> {
    const policy = await this.policyRepository.getPolicyById(externalId);
    if (!policy) {
      throw new AppError("Policy not found", 404);
    }
    return this.toResponse(policy);
  }

  async createPolicy(
    payload: CreatePolicyDto,
    actorUserId?: number,
  ): Promise<PolicyResponse> {
    const policy = new Policy();
    policy.body = payload.body;
    policy.createdBy = await this.findActor(actorUserId);
    const savedPolicy = await this.policyRepository.createPolicy(policy);
    return this.toResponse(savedPolicy);
  }

  async updatePolicy(
    externalId: string,
    payload: UpdatePolicyDto,
    actorUserId?: number,
  ): Promise<PolicyResponse> {
    const policy = await this.policyRepository.getPolicyById(externalId);
    if (!policy) {
      throw new AppError("Policy not found", 404);
    }

    if (payload.body !== undefined) policy.body = payload.body;
    if (payload.status !== undefined) policy.status = payload.status;
    if (payload.reason !== undefined) policy.reason = payload.reason;
    policy.updatedBy = await this.findActor(actorUserId);
    const updatedPolicy = await this.policyRepository.updatePolicy(policy);
    return this.toResponse(updatedPolicy);
  }

  async deletePolicy(externalId: string, actorUserId?: number): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.policyRepository.deletePolicy(externalId, actor);
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

  private toResponse(policy: Policy): PolicyResponse {
    return {
      id: policy.externalId,
      body: policy.body,
      status: policy.status,
      reason: policy.reason ?? null,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    };
  }
}
