import { PaymentDetails } from "../../entities/mysql/PaymentDetails";

export interface IPaymentDetailsRepository {
  getPaymentDetails(): Promise<PaymentDetails[]>;

  getPaymentDetailsById(externalId: string): Promise<PaymentDetails | null>;

  createPaymentDetails(paymentDetails: PaymentDetails): Promise<PaymentDetails>;

  updatePaymentDetails(paymentDetails: PaymentDetails): Promise<PaymentDetails>;

  deletePaymentDetails(externalId: string): Promise<void>;
}
