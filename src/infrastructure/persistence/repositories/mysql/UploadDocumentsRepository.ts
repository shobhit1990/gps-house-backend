import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { Client } from "../../../../domain/entities/mysql/Client";
import { UploadDocument } from "../../../../domain/entities/mysql/UploadDocumnets";
import { IUploadDocumentRepository } from "../../../../domain/repositories/mysql/IUploadDocumentsRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class UploadDocumentsRepository implements IUploadDocumentRepository {
  constructor(private readonly em: EntityManager) {}

  async createUploadDocument(
    document: UploadDocument,
  ): Promise<UploadDocument> {
    const em = this.em.fork();
    if (document.createdBy) {
      document.createdBy = em.getReference(Client, document.createdBy.id);
    }
    await em.persistAndFlush(document);
    return document;
  }

  async getUploadDocuments(): Promise<UploadDocument[]> {
    return this.em.fork().find(
      UploadDocument,
      { isDeleted: false },
    );
  }

  async getUploadDocumentById(
    externalId: string,
  ): Promise<UploadDocument | null> {
    return this.em
      .fork()
      .findOne(UploadDocument, { externalId, isDeleted: false });
  }

  async updateUploadDocument(
    document: UploadDocument,
  ): Promise<UploadDocument> {
    const em = this.em.fork();
    const existing = await em.findOne(UploadDocument, {
      externalId: document.externalId,
      isDeleted: false,
    });
    if (!existing) {
      throw new AppError("Upload document not found", 404);
    }

    em.assign(existing, {
      documentName: document.documentName,
      uploadDocument: document.uploadDocument,
      status: document.status,
      reason: document.reason,
      ...(document.updatedBy
        ? { updatedBy: em.getReference(Client, document.updatedBy.id) }
        : {}),
      updatedAt: new Date(),
    });
    await em.flush();
    return existing;
  }

  async deleteUploadDocument(
    externalId: string,
    deletedBy?: Client,
  ): Promise<void> {
    const em = this.em.fork();
    const document = await em.findOne(UploadDocument, {
      externalId,
      isDeleted: false,
    });
    if (!document) {
      throw new AppError("Upload document not found", 404);
    }

    const now = new Date();
    document.isDeleted = true;
    document.deletedAt = now;
    document.updatedAt = now;
    if (deletedBy) {
      document.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }
}
