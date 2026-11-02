import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { Client } from "../../../../domain/entities/mysql/Client";
import { TransferCoin } from "../../../../domain/entities/mysql/TransferCoin";
import { Transporter } from "../../../../domain/entities/mysql/Transporter";
import { ITransferCoinRepository } from "../../../../domain/repositories/mysql/ITransferCoinRepository";
import { AppError } from "../../../../utils/errors";

const relations = ["client", "transporter"] as const;

@injectable()
export class TransferCoinRepository implements ITransferCoinRepository {
  constructor(private readonly em: EntityManager) {}

  async getTransferCoins(): Promise<TransferCoin[]> {
    return this.em.fork().find(
      TransferCoin,
      { isDeleted: false },
      { populate: relations },
    );
  }

  async getTransferCoinById(externalId: string): Promise<TransferCoin | null> {
    return this.em
      .fork()
      .findOne(
        TransferCoin,
        { externalId, isDeleted: false },
        { populate: relations },
      );
  }

  async createTransferCoin(transferCoin: TransferCoin): Promise<TransferCoin> {
    const em = this.em.fork();
    this.assignRelations(em, transferCoin);
    if (transferCoin.createdBy) {
      transferCoin.createdBy = em.getReference(Client, transferCoin.createdBy.id);
    }
    await em.persistAndFlush(transferCoin);
    const created = await em.findOne(
      TransferCoin,
      { externalId: transferCoin.externalId, isDeleted: false },
      { populate: relations },
    );
    if (!created) throw new AppError("Transfer coin could not be loaded", 500);
    return created;
  }

  async updateTransferCoin(transferCoin: TransferCoin): Promise<TransferCoin> {
    const em = this.em.fork();
    const existing = await em.findOne(
      TransferCoin,
      { externalId: transferCoin.externalId, isDeleted: false },
      { populate: relations },
    );
    if (!existing) throw new AppError("Transfer coin not found", 404);

    em.assign(existing, {
      assignTo: transferCoin.assignTo,
      client: transferCoin.client
        ? em.getReference(Client, transferCoin.client.id)
        : null,
      transporter: transferCoin.transporter
        ? em.getReference(Transporter, transferCoin.transporter.id)
        : null,
      coins: transferCoin.coins,
      status: transferCoin.status ?? null,
      reason: transferCoin.reason ?? null,
      ...(transferCoin.updatedBy
        ? { updatedBy: em.getReference(Client, transferCoin.updatedBy.id) }
        : {}),
      updatedAt: new Date(),
    });
    await em.flush();
    const updated = await em.findOne(
      TransferCoin,
      { externalId: existing.externalId, isDeleted: false },
      { populate: relations },
    );
    if (!updated) throw new AppError("Transfer coin could not be loaded", 500);
    return updated;
  }

  async deleteTransferCoin(
    externalId: string,
    deletedBy?: Client,
  ): Promise<void> {
    const em = this.em.fork();
    const transferCoin = await em.findOne(TransferCoin, {
      externalId,
      isDeleted: false,
    });
    if (!transferCoin) throw new AppError("Transfer coin not found", 404);

    const now = new Date();
    transferCoin.isDeleted = true;
    transferCoin.deletedAt = now;
    transferCoin.updatedAt = now;
    if (deletedBy) {
      transferCoin.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }

  private assignRelations(em: EntityManager, transferCoin: TransferCoin): void {
    if (transferCoin.client) {
      transferCoin.client = em.getReference(Client, transferCoin.client.id);
    }
    if (transferCoin.transporter) {
      transferCoin.transporter = em.getReference(
        Transporter,
        transferCoin.transporter.id,
      );
    }
  }
}
