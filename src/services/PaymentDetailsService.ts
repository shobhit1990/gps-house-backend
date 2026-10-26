import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreatePaymentDetailsDto,
  UpdatePaymentDetailsDto,
} from "../domain/dto/PaymentDetailsDto";
import { PaymentDetails } from "../domain/entities/mysql/PaymentDetails";
import { Transporter } from "../domain/entities/mysql/Transporter";
import { IPaymentDetailsRepository } from "../domain/repositories/mysql/IPaymentDetailsRepository";
import {
  IPaymentDetailsService,
  PaymentDetailsResponse,
} from "./interfaces/IPaymentDetailsService";
import { AppError } from "../utils/errors";

@injectable()
export class PaymentDetailsService implements IPaymentDetailsService {
  constructor(
    @inject("IPaymentDetailsRepository")
    private readonly paymentDetailsRepository: IPaymentDetailsRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getPaymentDetails(): Promise<PaymentDetailsResponse[]> {
    const paymentDetails =
      await this.paymentDetailsRepository.getPaymentDetails();
    return paymentDetails.map((item) => this.toResponse(item));
  }

  async getPaymentDetailsById(
    externalId: string,
  ): Promise<PaymentDetailsResponse> {
    const paymentDetails =
      await this.paymentDetailsRepository.getPaymentDetailsById(externalId);
    if (!paymentDetails) {
      throw new AppError("Payment details not found", 404);
    }
    return this.toResponse(paymentDetails);
  }

  async createPaymentDetails(
    payload: CreatePaymentDetailsDto,
  ): Promise<PaymentDetailsResponse> {
    const transporter = await this.findTransporter(payload.transporter);
    const paymentDetails = new PaymentDetails();
    this.assignFields(paymentDetails, payload);
    paymentDetails.transporter = transporter;

    const created =
      await this.paymentDetailsRepository.createPaymentDetails(paymentDetails);
    return this.toResponse(created);
  }

  async updatePaymentDetails(
    externalId: string,
    payload: UpdatePaymentDetailsDto,
  ): Promise<PaymentDetailsResponse> {
    const existing =
      await this.paymentDetailsRepository.getPaymentDetailsById(externalId);
    if (!existing) {
      throw new AppError("Payment details not found", 404);
    }

    if (payload.transporter !== undefined) {
      existing.transporter = await this.findTransporter(payload.transporter);
    }
    this.assignFields(existing, payload);

    const updated =
      await this.paymentDetailsRepository.updatePaymentDetails(existing);
    return this.toResponse(updated);
  }

  async deletePaymentDetails(externalId: string): Promise<void> {
    await this.paymentDetailsRepository.deletePaymentDetails(externalId);
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
    paymentDetails: PaymentDetails,
    payload: CreatePaymentDetailsDto | UpdatePaymentDetailsDto,
  ): void {
    if (payload.type !== undefined) paymentDetails.type = payload.type;
    if (payload.sellingPrice !== undefined) {
      paymentDetails.sellingPrice = payload.sellingPrice;
    }
    if (payload.paymentTerm !== undefined) {
      paymentDetails.paymentTerm = payload.paymentTerm;
    }
    if (payload.installationDate !== undefined) {
      paymentDetails.installationDate = new Date(payload.installationDate);
    }
    if (payload.rentalDueDate !== undefined) {
      paymentDetails.rentalDueDate = new Date(payload.rentalDueDate);
    }
    if (payload.technicianName !== undefined) {
      paymentDetails.technicianName = payload.technicianName;
    }
    if (payload.rental !== undefined) paymentDetails.rental = payload.rental;
    if (payload.remark !== undefined) paymentDetails.remark = payload.remark;
    if (payload.status !== undefined) paymentDetails.status = payload.status;
    if (payload.reason !== undefined) paymentDetails.reason = payload.reason;
  }

  private toResponse(paymentDetails: PaymentDetails): PaymentDetailsResponse {
    return {
      id: paymentDetails.externalId,
      type: paymentDetails.type ?? null,
      transporter: {
        id: paymentDetails.transporter.externalId,
        name: paymentDetails.transporter.name ?? null,
        companyName: paymentDetails.transporter.companyName,
      },
      sellingPrice: paymentDetails.sellingPrice ?? null,
      paymentTerm: paymentDetails.paymentTerm,
      installationDate:
        paymentDetails.installationDate?.toISOString().slice(0, 10) ?? null,
      rentalDueDate:
        paymentDetails.rentalDueDate?.toISOString().slice(0, 10) ?? null,
      technicianName: paymentDetails.technicianName ?? null,
      rental: paymentDetails.rental ?? null,
      remark: paymentDetails.remark ?? null,
      status: paymentDetails.status ?? null,
      reason: paymentDetails.reason ?? null,
      createdAt: paymentDetails.createdAt,
      updatedAt: paymentDetails.updatedAt,
    };
  }
}
