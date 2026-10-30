import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  UpdateUploadDocumentDto,
  UploadDocumentDto,
} from "../domain/dto/UploadDocumentsDto";
import { Client } from "../domain/entities/mysql/Client";
import { UploadDocument } from "../domain/entities/mysql/UploadDocumnets";
import { Status } from "../domain/enums/status";
import { IUploadDocumentRepository } from "../domain/repositories/mysql/IUploadDocumentsRepository";
import { AppError } from "../utils/errors";
import {
  IUploadDocumentsService,
  UploadDocumentResponse,
} from "./interfaces/IUploadDocumentsService";

@injectable()
export class UploadDocumentsService implements IUploadDocumentsService {
  constructor(
    @inject("IUploadDocumentRepository")
    private readonly uploadDocumentRepository: IUploadDocumentRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getUploadDocuments(): Promise<UploadDocumentResponse[]> {
    const documents = await this.uploadDocumentRepository.getUploadDocuments();
    return documents.map((document) => this.toResponse(document));
  }

  async getUploadDocumentById(
    externalId: string,
  ): Promise<UploadDocumentResponse> {
    const document =
      await this.uploadDocumentRepository.getUploadDocumentById(externalId);
    if (!document) {
      throw new AppError("Upload document not found", 404);
    }
    return this.toResponse(document);
  }

  async createUploadDocument(
    payload: UploadDocumentDto,
    actorUserId?: number,
  ): Promise<UploadDocumentResponse> {
    const document = new UploadDocument();
    document.documentName = payload.documentName;
    document.uploadDocument = payload.uploadDocument;
    document.status = payload.status ?? Status.ACTIVE;
    document.reason = payload.reason ?? undefined;
    document.createdBy = await this.findActor(actorUserId);
    return this.toResponse(
      await this.uploadDocumentRepository.createUploadDocument(document),
    );
  }

  async updateUploadDocument(
    externalId: string,
    payload: UpdateUploadDocumentDto,
    actorUserId?: number,
  ): Promise<UploadDocumentResponse> {
    const document =
      await this.uploadDocumentRepository.getUploadDocumentById(externalId);
    if (!document) {
      throw new AppError("Upload document not found", 404);
    }

    document.updatedBy = await this.findActor(actorUserId);
    if (payload.documentName !== undefined) {
      document.documentName = payload.documentName;
    }
    if (payload.uploadDocument !== undefined) {
      document.uploadDocument = payload.uploadDocument;
    }
    if (payload.status !== undefined) document.status = payload.status;
    if (payload.reason !== undefined) {
      document.reason = payload.reason ?? undefined;
    }
    return this.toResponse(
      await this.uploadDocumentRepository.updateUploadDocument(document),
    );
  }

  async deleteUploadDocument(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.uploadDocumentRepository.deleteUploadDocument(externalId, actor);
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

  private toResponse(document: UploadDocument): UploadDocumentResponse {
    return {
      id: document.externalId,
      documentName: document.documentName,
      uploadDocument: document.uploadDocument,
      status: document.status,
      reason: document.reason ?? null,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
