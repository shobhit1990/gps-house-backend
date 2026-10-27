import {
  CreateBillingDetailDto,
  UpdateBillingDetailDto,
} from "../../domain/dto/BillingDetailDto";

export interface BillingDetailResponse {
  id: string;
  transporter: {
    id: string;
    name: string | null;
    companyName: string;
  };
  billingName: string | null;
  gstNumber: string | null;
  billingEmail: string | null;
  billingPhone: string | null;
  billingAddress: string | null;
  paymentMode: string | null;
  status: string | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBillingDetailService {
  getBillingDetails(): Promise<BillingDetailResponse[]>;

  getBillingDetailById(externalId: string): Promise<BillingDetailResponse>;

  createBillingDetail(
    payload: CreateBillingDetailDto,
    actorUserId?: number,
  ): Promise<BillingDetailResponse>;

  updateBillingDetail(
    externalId: string,
    payload: UpdateBillingDetailDto,
    actorUserId?: number,
  ): Promise<BillingDetailResponse>;

  deleteBillingDetail(externalId: string, actorUserId?: number): Promise<void>;
}
