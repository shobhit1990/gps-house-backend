import {
  UpdateUploadDocumentDto,
  UploadDocumentDto,
} from "../../domain/dto/UploadDocumentsDto";
import { Status } from "../../domain/enums/status";

export interface UploadDocumentResponse {
  id: string;
  documentName: string;
  uploadDocument: string[];
  status: Status;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUploadDocumentsService {
  getUploadDocuments(): Promise<UploadDocumentResponse[]>;
  getUploadDocumentById(externalId: string): Promise<UploadDocumentResponse>;
  createUploadDocument(
    payload: UploadDocumentDto,
    actorUserId?: number,
  ): Promise<UploadDocumentResponse>;
  updateUploadDocument(
    externalId: string,
    payload: UpdateUploadDocumentDto,
    actorUserId?: number,
  ): Promise<UploadDocumentResponse>;
  deleteUploadDocument(externalId: string, actorUserId?: number): Promise<void>;
}
