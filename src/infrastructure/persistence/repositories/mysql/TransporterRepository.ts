import { injectable } from "tsyringe";
import { ITransporterRepository } from "../../../../domain/repositories/mysql/ITranporterRepository";
import { EntityManager } from "@mikro-orm/mysql";
import { Transporter } from "../../../../domain/entities/mysql/Transporter";
import { User } from "../../../../domain/entities/mysql/User";
import { Client } from "../../../../domain/entities/mysql/Client";
import { Language } from "../../../../domain/entities/mysql/Language";
import { TimeZone } from "../../../../domain/entities/mysql/TimeZone";
import { AppError } from "../../../../utils/errors";

@injectable()
export class TransporterRepository implements ITransporterRepository {
  constructor(private readonly em: EntityManager) {}

  async getTransporter(): Promise<Transporter[]> {
    const emFork = this.em.fork();
    const transporterData = await emFork.find(
      Transporter,
      { isDeleted: false },
      { populate: ["createdBy", "client", "language", "timezone"] },
    );
    return transporterData;
  }

  async getTransporterById(externalId: string): Promise<Transporter | null> {
    const emFork = this.em.fork();
    return await emFork.findOne(
      Transporter,
      {
        externalId: externalId,
        isDeleted: false,
      },
      { populate: ["createdBy", "client", "language", "timezone"] },
    );
  }

  async createTransporter(
    transporter: Transporter,
    unifiedUser?: User,
  ): Promise<Transporter> {
    const emFork = this.em.fork();
    if (unifiedUser) {
      unifiedUser.client = unifiedUser.client
        ? emFork.getReference(User, unifiedUser.client.id)
        : undefined;
      unifiedUser.language = unifiedUser.language
        ? emFork.getReference(Language, unifiedUser.language.id)
        : undefined;
      unifiedUser.timezone = unifiedUser.timezone
        ? emFork.getReference(TimeZone, unifiedUser.timezone.id)
        : undefined;
      emFork.persist(unifiedUser);
    }
    emFork.persist(transporter);
    await emFork.flush();
    return transporter;
  }

  async updateTransporter(transporter: Transporter): Promise<Transporter> {
    const emFork = this.em.fork();

    const existing = await emFork.findOne(Transporter, {
      externalId: transporter.externalId,
      isDeleted: false,
    });

    if (!existing) {
      throw new AppError("Transporter not found", 404);
    }

    emFork.assign(existing, {
      userName: transporter.userName,
      companyName: transporter.companyName,
      name: transporter.name,
      email: transporter.email,
      phone: transporter.phone,
      address: transporter.address,

      client: transporter.client,
      language: transporter.language,
      timezone: transporter.timezone,

      inactiveTime: transporter.inactiveTime,
      status: transporter.status,
      reason: transporter.reason,

      subscriptionStartDate: transporter.subscriptionStartDate,
      subscriptionDueDate: transporter.subscriptionDueDate,
      subscriptionExtendDate: transporter.subscriptionExtendDate,
      subscriptionExpiryCount: transporter.subscriptionExpiryCount,

      maximumRadiusForNearestPOI: transporter.maximumRadiusForNearestPOI,

      minimumDistanceForAddress: transporter.minimumDistanceForAddress,

      dataRestriction: transporter.dataRestriction,

      updatedAt: new Date(),
    });

    // Password ko sirf tab update karein jab naya password diya gaya ho.
    if (transporter.password) {
      existing.password = transporter.password;
    }

    await emFork.flush();

    return existing;
  }

  async deleteTransporter(externalId: string): Promise<void> {
    const emFork = this.em.fork();

    const transporter = await emFork.findOne(Transporter, { externalId });

    if (!transporter) {
      throw new AppError("Transporter not found", 404);
    }

    transporter.isDeleted = true;

    await emFork.persistAndFlush(transporter);
  }
}
