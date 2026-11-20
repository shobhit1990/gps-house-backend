import { container } from "tsyringe";
import { IPolicyRepository } from "../../../domain/repositories/mysql/IPolicyRepository";
import { IPolicyService } from "../../../services/interfaces/IPolicyService";
import { PolicyService } from "../../../services/PolicyService";
import { PolicyRepository } from "../../persistence/repositories/mysql/PolicyRepository";

export function registerPolicyDependencies() {
  container.register<IPolicyRepository>(
    "IPolicyRepository",
    PolicyRepository,
  );
  container.register<IPolicyService>("IPolicyService", PolicyService);
}
