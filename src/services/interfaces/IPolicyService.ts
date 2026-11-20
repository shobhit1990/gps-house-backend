import { CreatePolicyDto, UpdatePolicyDto } from "../../domain/dto/PolicyDto";

export interface PolicyResponse {
  id: string;
  body: string;
  status: string;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPolicyService {
  getPolicies(): Promise<PolicyResponse[]>;

  getPolicyById(externalId: string): Promise<PolicyResponse>;

  createPolicy(
    payload: CreatePolicyDto,
    actorUserId?: number,
  ): Promise<PolicyResponse>;

  updatePolicy(
    externalId: string,
    payload: UpdatePolicyDto,
    actorUserId?: number,
  ): Promise<PolicyResponse>;

  deletePolicy(externalId: string, actorUserId?: number): Promise<void>;
}
