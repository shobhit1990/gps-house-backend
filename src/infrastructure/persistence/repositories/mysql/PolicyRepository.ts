import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { Client } from "../../../../domain/entities/mysql/Client";
import { Policy } from "../../../../domain/entities/mysql/Policy";
import { IPolicyRepository } from "../../../../domain/repositories/mysql/IPolicyRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class PolicyRepository implements IPolicyRepository {
  constructor(private readonly em: EntityManager) {}

  async getPolicies(): Promise<Policy[]> {
    return this.em.fork().find(Policy, { isDeleted: false });
  }

  async getPolicyById(externalId: string): Promise<Policy | null> {
    return this.em.fork().findOne(Policy, {
      externalId,
      isDeleted: false,
    });
  }

  async createPolicy(policy: Policy): Promise<Policy> {
    const em = this.em.fork();
    if (policy.createdBy) {
      policy.createdBy = em.getReference(Client, policy.createdBy.id);
    }
    await em.persistAndFlush(policy);
    return policy;
  }

  async updatePolicy(policy: Policy): Promise<Policy> {
    const em = this.em.fork();
    const existing = await em.findOne(Policy, {
      externalId: policy.externalId,
      isDeleted: false,
    });
    if (!existing) {
      throw new AppError("Policy not found", 404);
    }

    em.assign(existing, {
      body: policy.body,
      status: policy.status,
      reason: policy.reason,
      ...(policy.updatedBy
        ? { updatedBy: em.getReference(Client, policy.updatedBy.id) }
        : {}),
    });
    await em.flush();
    return existing;
  }

  async deletePolicy(externalId: string, deletedBy?: Client): Promise<void> {
    const em = this.em.fork();
    const policy = await em.findOne(Policy, {
      externalId,
      isDeleted: false,
    });
    if (!policy) {
      throw new AppError("Policy not found", 404);
    }

    policy.isDeleted = true;
    policy.deletedAt = new Date();
    if (deletedBy) {
      policy.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }
}
