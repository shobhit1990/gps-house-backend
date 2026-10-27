import {
  CreatePaymentDetailsDto,
  UpdatePaymentDetailsDto,
} from "../../domain/dto/PaymentDetailsDto";

export interface PaymentDetailsResponse {
  id: string;
  type: string | null;
  transporter: {
    id: string;
    name: string | null;
    companyName: string;
  };
  sellingPrice: number | null;
  paymentTerm: string;
  installationDate: string | null;
  rentalDueDate: string | null;
  technicianName: string | null;
  rental: number | null;
  remark: string | null;
  status: string | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentDetailsService {
  getPaymentDetails(): Promise<PaymentDetailsResponse[]>;

  getPaymentDetailsById(externalId: string): Promise<PaymentDetailsResponse>;

  createPaymentDetails(
    payload: CreatePaymentDetailsDto,
  ): Promise<PaymentDetailsResponse>;

  updatePaymentDetails(
    externalId: string,
    payload: UpdatePaymentDetailsDto,
  ): Promise<PaymentDetailsResponse>;

  deletePaymentDetails(externalId: string): Promise<void>;
}
