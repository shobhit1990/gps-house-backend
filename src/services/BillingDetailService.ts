import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateBillingDetailDto,
  UpdateBillingDetailDto,
} from "../domain/dto/BillingDetailDto";
import { BillingDetail } from "../domain/entities/mysql/BillingDetail";
import { Client } from "../domain/entities/mysql/Client";
import { Transporter } from "../domain/entities/mysql/Transporter";
import { Status } from "../domain/enums/status";
import { IBillingDetailRepository } from "../domain/repositories/mysql/IBillingDetailRepository";
import {
  BillingDetailResponse,
  IBillingDetailService,
} from "./interfaces/IBillingDetailService";
import { AppError } from "../utils/errors";

@injectable()
export class BillingDetailService implements IBillingDetailService {
  constructor(
    @inject("IBillingDetailRepository")
    private readonly billingDetailRepository: IBillingDetailRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getBillingDetails(): Promise<BillingDetailResponse[]> {
    const billingDetails =
      await this.billingDetailRepository.getBillingDetails();
    return billingDetails.map((item) => this.toResponse(item));
  }

  async getBillingDetailById(
    externalId: string,
  ): Promise<BillingDetailResponse> {
    const billingDetail =
      await this.billingDetailRepository.getBillingDetailById(externalId);
    if (!billingDetail) {
      throw new AppError("Billing detail not found", 404);
    }
    return this.toResponse(billingDetail);
  }

  async createBillingDetail(
    payload: CreateBillingDetailDto,
    actorUserId?: number,
  ): Promise<BillingDetailResponse> {
    const [transporter, actor] = await Promise.all([
      this.findTransporter(payload.transporter),
      this.findActor(actorUserId),
    ]);
    const billingDetail = new BillingDetail();
    billingDetail.transporter = transporter;
    billingDetail.createdBy = actor;
    this.assignFields(billingDetail, payload);
    const created =
      await this.billingDetailRepository.createBillingDetail(billingDetail);
    return this.toResponse(created);
  }

  async updateBillingDetail(
    externalId: string,
    payload: UpdateBillingDetailDto,
    actorUserId?: number,
  ): Promise<BillingDetailResponse> {
    const existing =
      await this.billingDetailRepository.getBillingDetailById(externalId);
    if (!existing) {
      throw new AppError("Billing detail not found", 404);
    }

    const actor = await this.findActor(actorUserId);
    if (actor) existing.updatedBy = actor;

    if (payload.transporter !== undefined) {
      existing.transporter = await this.findTransporter(payload.transporter);
    }
    this.assignFields(existing, payload);
    const updated =
      await this.billingDetailRepository.updateBillingDetail(existing);
    return this.toResponse(updated);
  }

  async deleteBillingDetail(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.billingDetailRepository.deleteBillingDetail(externalId, actor);
  }

  private async findActor(userId?: number): Promise<Client | undefined> {
    if (userId === undefined) return undefined;
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new AppError("Invalid user ID", 401);
    }

    const actor = await this.em.fork().findOne(Client, {
      id: userId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!actor) {
      throw new AppError("User not found", 401);
    }
    return actor;
  }

  private async findTransporter(externalId: string): Promise<Transporter> {
    const transporter = await this.em.fork().findOne(Transporter, {
      externalId,
      isDeleted: false,
    });
    if (!transporter) {
      throw new AppError("Transporter not found", 404);
    }
    return transporter;
  }

  private assignFields(
    billingDetail: BillingDetail,
    payload: CreateBillingDetailDto | UpdateBillingDetailDto,
  ): void {
    if (payload.billingName !== undefined) {
      billingDetail.billingName = payload.billingName;
    }
    if (payload.gstNumber !== undefined) {
      billingDetail.gstNumber = payload.gstNumber;
    }
    if (payload.billingEmail !== undefined) {
      billingDetail.billingEmail = payload.billingEmail;
    }
    if (payload.billingPhone !== undefined) {
      billingDetail.billingPhone = payload.billingPhone;
    }
    if (payload.billingAddress !== undefined) {
      billingDetail.billingAddress = payload.billingAddress;
    }
    if (payload.paymentMode !== undefined) {
      billingDetail.paymentMode = payload.paymentMode;
    }
    if (payload.status !== undefined) billingDetail.status = payload.status;
    if (payload.reason !== undefined) billingDetail.reason = payload.reason;
  }

  private toResponse(billingDetail: BillingDetail): BillingDetailResponse {
    return {
      id: billingDetail.externalId,
      transporter: {
        id: billingDetail.transporter.externalId,
        name: billingDetail.transporter.name ?? null,
        companyName: billingDetail.transporter.companyName,
      },
      billingName: billingDetail.billingName ?? null,
      gstNumber: billingDetail.gstNumber ?? null,
      billingEmail: billingDetail.billingEmail ?? null,
      billingPhone: billingDetail.billingPhone ?? null,
      billingAddress: billingDetail.billingAddress ?? null,
      paymentMode: billingDetail.paymentMode ?? null,
      status: billingDetail.status ?? null,
      reason: billingDetail.reason ?? null,
      createdAt: billingDetail.createdAt,
      updatedAt: billingDetail.updatedAt,
    };
  }
}
