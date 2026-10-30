import { Client } from "../../entities/mysql/Client";
import { UploadDocument } from "../../entities/mysql/UploadDocumnets";

export interface IUploadDocumentRepository {
  createUploadDocument(document: UploadDocument): Promise<UploadDocument>;

  getUploadDocuments(): Promise<UploadDocument[]>;

  getUploadDocumentById(externalId: string): Promise<UploadDocument | null>;

  updateUploadDocument(document: UploadDocument): Promise<UploadDocument>;

  deleteUploadDocument(externalId: string, deletedBy?: Client): Promise<void>;
}
