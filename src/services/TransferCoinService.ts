import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateTransferCoinDto,
  UpdateTransferCoinDto,
} from "../domain/dto/TransferCoinDto";
import { Client } from "../domain/entities/mysql/Client";
import { TransferCoin } from "../domain/entities/mysql/TransferCoin";
import { Transporter } from "../domain/entities/mysql/Transporter";
import { AssignTo } from "../domain/enums/AssignTo";
import { Status } from "../domain/enums/status";
import { ITransferCoinRepository } from "../domain/repositories/mysql/ITransferCoinRepository";
import { AppError } from "../utils/errors";
import {
  ITransferCoinService,
  TransferCoinResponse,
} from "./interfaces/ITransferCoinService";

@injectable()
export class TransferCoinService implements ITransferCoinService {
  constructor(
    @inject("ITransferCoinRepository")
    private readonly repository: ITransferCoinRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getTransferCoins(): Promise<TransferCoinResponse[]> {
    const records = await this.repository.getTransferCoins();
    return records.map((record) => this.toResponse(record));
  }

  async getTransferCoinById(externalId: string): Promise<TransferCoinResponse> {
    const record = await this.repository.getTransferCoinById(externalId);
    if (!record) throw new AppError("Transfer coin not found", 404);
    return this.toResponse(record);
  }

  async createTransferCoin(
    payload: CreateTransferCoinDto,
    actorUserId?: number,
  ): Promise<TransferCoinResponse> {
    const recipient = await this.resolveRecipient(
      payload.assignTo,
      payload.client,
      payload.transporter,
    );
    const record = new TransferCoin();
    record.assignTo = payload.assignTo;
    record.client = recipient.client;
    record.transporter = recipient.transporter;
    record.coins = payload.coins;
    record.status = payload.status ?? null;
    record.reason = payload.reason ?? null;
    record.createdBy = await this.findActor(actorUserId);
    return this.toResponse(await this.repository.createTransferCoin(record));
  }

  async updateTransferCoin(
    externalId: string,
    payload: UpdateTransferCoinDto,
    actorUserId?: number,
  ): Promise<TransferCoinResponse> {
    if (Object.keys(payload).length === 0) {
      throw new AppError("At least one field is required to update a transfer coin", 400);
    }
    const record = await this.repository.getTransferCoinById(externalId);
    if (!record) throw new AppError("Transfer coin not found", 404);

    const assignTo = payload.assignTo ?? record.assignTo;
    const clientId =
      payload.client !== undefined
        ? payload.client
        : assignTo === AssignTo.CLIENT
          ? record.client?.externalId
          : undefined;
    const transporterId =
      payload.transporter !== undefined
        ? payload.transporter
        : assignTo === AssignTo.TRANSPORTER
          ? record.transporter?.externalId
          : undefined;
    const recipient = await this.resolveRecipient(
      assignTo,
      clientId,
      transporterId,
    );

    record.assignTo = assignTo;
    record.client = recipient.client;
    record.transporter = recipient.transporter;
    if (payload.coins !== undefined) record.coins = payload.coins;
    if (payload.status !== undefined) record.status = payload.status;
    if (payload.reason !== undefined) record.reason = payload.reason;

    const actor = await this.findActor(actorUserId);
    if (actor) record.updatedBy = actor;
    return this.toResponse(await this.repository.updateTransferCoin(record));
  }

  async deleteTransferCoin(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.repository.deleteTransferCoin(externalId, actor);
  }

  private async resolveRecipient(
    assignTo: AssignTo,
    clientId?: string,
    transporterId?: string,
  ): Promise<{ client: Client | null; transporter: Transporter | null }> {
    if (assignTo === AssignTo.CLIENT) {
      if (!clientId || transporterId) {
        throw new AppError("A client must be selected for client assignment", 400);
      }
      const client = await this.em.fork().findOne(Client, {
        externalId: clientId,
        isDeleted: false,
      });
      if (!client) throw new AppError("Client not found", 404);
      if (client.status !== Status.ACTIVE) {
        throw new AppError("Client is inactive", 400);
      }
      return { client, transporter: null };
    }

    if (assignTo === AssignTo.TRANSPORTER) {
      if (!transporterId || clientId) {
        throw new AppError(
          "A transporter must be selected for transporter assignment",
          400,
        );
      }
      const transporter = await this.em.fork().findOne(Transporter, {
        externalId: transporterId,
        isDeleted: false,
      });
      if (!transporter) throw new AppError("Transporter not found", 404);
      if (transporter.status !== Status.ACTIVE) {
        throw new AppError("Transporter is inactive", 400);
      }
      return { client: null, transporter };
    }

    throw new AppError("Invalid assignment type", 400);
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
    if (!actor) throw new AppError("User not found", 401);
    return actor;
  }

  private toResponse(record: TransferCoin): TransferCoinResponse {
    return {
      id: record.externalId,
      assignTo: record.assignTo,
      client: record.client
        ? {
            id: record.client.externalId,
            name: record.client.name ?? null,
            companyName: record.client.companyName,
          }
        : null,
      transporter: record.transporter
        ? {
            id: record.transporter.externalId,
            name: record.transporter.name ?? null,
            companyName: record.transporter.companyName,
          }
        : null,
      coins: record.coins,
      status: record.status ?? null,
      reason: record.reason ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
