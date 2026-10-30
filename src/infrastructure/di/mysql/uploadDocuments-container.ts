import { container } from "tsyringe";
import { IUploadDocumentRepository } from "../../../domain/repositories/mysql/IUploadDocumentsRepository";
import { IUploadDocumentsService } from "../../../services/interfaces/IUploadDocumentsService";
import { UploadDocumentsService } from "../../../services/UploadDocumentsService";
import { UploadDocumentsRepository } from "../../persistence/repositories/mysql/UploadDocumentsRepository";

export function registerUploadDocumentsDependencies() {
  container.register<IUploadDocumentRepository>(
    "IUploadDocumentRepository",
    UploadDocumentsRepository,
  );
  container.register<IUploadDocumentsService>(
    "IUploadDocumentsService",
    UploadDocumentsService,
  );
}
