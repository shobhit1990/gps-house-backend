import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { AddVehicle } from "../../../../domain/entities/mysql/AddVehicle";
import { PaymentDetails } from "../../../../domain/entities/mysql/PaymentDetails";
import { Transporter } from "../../../../domain/entities/mysql/Transporter";
import { IPaymentDetailsRepository } from "../../../../domain/repositories/mysql/IPaymentDetailsRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class PaymentDetailsRepository implements IPaymentDetailsRepository {
  constructor(private readonly em: EntityManager) {}

  async getPaymentDetails(): Promise<PaymentDetails[]> {
    return this.em.fork().find(
      PaymentDetails,
      { isDeleted: false },
      {
        populate: ["transporter", "vehicle"],
        orderBy: { createdAt: "DESC" },
      },
    );
  }

  async getPaymentDetailsById(
    externalId: string,
  ): Promise<PaymentDetails | null> {
    return this.em.fork().findOne(
      PaymentDetails,
      { externalId, isDeleted: false },
      { populate: ["transporter", "vehicle"] },
    );
  }

  async createPaymentDetails(
    paymentDetails: PaymentDetails,
  ): Promise<PaymentDetails> {
    const em = this.em.fork();
    paymentDetails.transporter = em.getReference(
      Transporter,
      paymentDetails.transporter.id,
    );
    if (paymentDetails.vehicle) {
      paymentDetails.vehicle = em.getReference(
        AddVehicle,
        paymentDetails.vehicle.id,
      );
    }
    await em.persistAndFlush(paymentDetails);
    await em.populate(paymentDetails, ["transporter", "vehicle"]);
    return paymentDetails;
  }

  async updatePaymentDetails(
    paymentDetails: PaymentDetails,
  ): Promise<PaymentDetails> {
    const em = this.em.fork();
    const existing = await em.findOne(
      PaymentDetails,
      {
        externalId: paymentDetails.externalId,
        isDeleted: false,
      },
      { populate: ["transporter", "vehicle"] },
    );

    if (!existing) {
      throw new AppError("Payment details not found", 404);
    }

    em.assign(existing, {
      type: paymentDetails.type,
      transporter: em.getReference(Transporter, paymentDetails.transporter.id),
      vehicle: paymentDetails.vehicle
        ? em.getReference(AddVehicle, paymentDetails.vehicle.id)
        : null,
      sellingPrice: paymentDetails.sellingPrice,
      paymentTerm: paymentDetails.paymentTerm,
      installationDate: paymentDetails.installationDate,
      rentalDueDate: paymentDetails.rentalDueDate,
      technicianName: paymentDetails.technicianName,
      rental: paymentDetails.rental,
      remark: paymentDetails.remark,
      status: paymentDetails.status,
      reason: paymentDetails.reason,
    });
    await em.flush();
    await em.populate(existing, ["transporter", "vehicle"]);
    return existing;
  }

  async deletePaymentDetails(externalId: string): Promise<void> {
    const em = this.em.fork();
    const paymentDetails = await em.findOne(PaymentDetails, {
      externalId,
      isDeleted: false,
    });

    if (!paymentDetails) {
      throw new AppError("Payment details not found", 404);
    }

    paymentDetails.isDeleted = true;
    paymentDetails.updatedAt = new Date();
    await em.flush();
  }
}
