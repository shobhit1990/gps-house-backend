import { container } from "tsyringe";
import { IBillingDetailRepository } from "../../../domain/repositories/mysql/IBillingDetailRepository";
import { BillingDetailRepository } from "../../persistence/repositories/mysql/BillingDetailRepository";
import { IBillingDetailService } from "../../../services/interfaces/IBillingDetailService";
import { BillingDetailService } from "../../../services/BillingDetailService";

export function registerBillingDetailDependencies() {
  container.register<IBillingDetailRepository>(
    "IBillingDetailRepository",
    BillingDetailRepository,
  );
  container.register<IBillingDetailService>(
    "IBillingDetailService",
    BillingDetailService,
  );
}
