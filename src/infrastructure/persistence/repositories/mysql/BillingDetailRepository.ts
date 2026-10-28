import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { BillingDetail } from "../../../../domain/entities/mysql/BillingDetail";
import { Client } from "../../../../domain/entities/mysql/Client";
import { Transporter } from "../../../../domain/entities/mysql/Transporter";
import { IBillingDetailRepository } from "../../../../domain/repositories/mysql/IBillingDetailRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class BillingDetailRepository implements IBillingDetailRepository {
  constructor(private readonly em: EntityManager) {}

  async getBillingDetails(): Promise<BillingDetail[]> {
    return this.em
      .fork()
      .find(
        BillingDetail,
        { isDeleted: false },
        { populate: ["transporter"]},
      );
  }

  async getBillingDetailById(
    externalId: string,
  ): Promise<BillingDetail | null> {
    return this.em
      .fork()
      .findOne(
        BillingDetail,
        { externalId, isDeleted: false },
        { populate: ["transporter"] },
      );
  }

  async createBillingDetail(
    billingDetail: BillingDetail,
  ): Promise<BillingDetail> {
    const em = this.em.fork();
    billingDetail.transporter = em.getReference(
      Transporter,
      billingDetail.transporter.id,
    );
    if (billingDetail.createdBy) {
      billingDetail.createdBy = em.getReference(
        Client,
        billingDetail.createdBy.id,
      );
    }
    await em.persistAndFlush(billingDetail);
    await em.populate(billingDetail, ["transporter"]);
    return billingDetail;
  }

  async updateBillingDetail(
    billingDetail: BillingDetail,
  ): Promise<BillingDetail> {
    const em = this.em.fork();
    const existing = await em.findOne(BillingDetail, {
      externalId: billingDetail.externalId,
      isDeleted: false,
    });

    if (!existing) {
      throw new AppError("Billing detail not found", 404);
    }

    em.assign(existing, {
      transporter: em.getReference(Transporter, billingDetail.transporter.id),
      billingName: billingDetail.billingName,
      gstNumber: billingDetail.gstNumber,
      billingEmail: billingDetail.billingEmail,
      billingPhone: billingDetail.billingPhone,
      billingAddress: billingDetail.billingAddress,
      paymentMode: billingDetail.paymentMode,
      status: billingDetail.status,
      reason: billingDetail.reason,
      ...(billingDetail.updatedBy
        ? { updatedBy: em.getReference(Client, billingDetail.updatedBy.id) }
        : {}),
    });
    await em.flush();
    await em.populate(existing, ["transporter"]);
    return existing;
  }

  async deleteBillingDetail(
    externalId: string,
    deletedBy?: Client,
  ): Promise<void> {
    const em = this.em.fork();
    const billingDetail = await em.findOne(BillingDetail, {
      externalId,
      isDeleted: false,
    });

    if (!billingDetail) {
      throw new AppError("Billing detail not found", 404);
    }

    billingDetail.isDeleted = true;
    if (deletedBy) {
      billingDetail.deletedBy = em.getReference(Client, deletedBy.id);
    }
    billingDetail.updatedAt = new Date();
    await em.flush();
  }
}
