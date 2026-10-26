import { container } from "tsyringe";
import { IPaymentDetailsRepository } from "../../../domain/repositories/mysql/IPaymentDetailsRepository";
import { PaymentDetailsRepository } from "../../persistence/repositories/mysql/PaymentDetailsRepository";
import { IPaymentDetailsService } from "../../../services/interfaces/IPaymentDetailsService";
import { PaymentDetailsService } from "../../../services/PaymentDetailsService";

export function registerPaymentDetailsDependencies() {
  container.register<IPaymentDetailsRepository>(
    "IPaymentDetailsRepository",
    PaymentDetailsRepository,
  );
  container.register<IPaymentDetailsService>(
    "IPaymentDetailsService",
    PaymentDetailsService,
  );
}
