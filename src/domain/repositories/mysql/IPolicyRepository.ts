import { Client } from "../../entities/mysql/Client";
import { Policy } from "../../entities/mysql/Policy";

export interface IPolicyRepository {
  getPolicies(): Promise<Policy[]>;

  getPolicyById(externalId: string): Promise<Policy | null>;

  createPolicy(policy: Policy): Promise<Policy>;

  updatePolicy(policy: Policy): Promise<Policy>;

  deletePolicy(externalId: string, deletedBy?: Client): Promise<void>;
}
