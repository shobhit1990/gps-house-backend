import { BillingDetail } from "../../entities/mysql/BillingDetail";
import { Client } from "../../entities/mysql/Client";

export interface IBillingDetailRepository {
  getBillingDetails(): Promise<BillingDetail[]>;

  getBillingDetailById(externalId: string): Promise<BillingDetail | null>;

  createBillingDetail(billingDetail: BillingDetail): Promise<BillingDetail>;

  updateBillingDetail(billingDetail: BillingDetail): Promise<BillingDetail>;

  deleteBillingDetail(externalId: string, deletedBy?: Client): Promise<void>;
}
