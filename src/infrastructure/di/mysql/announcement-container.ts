import { container } from "tsyringe";
import { IAnnouncementRepository } from "../../../domain/repositories/mysql/IAnnouncementRepository";
import { AnnouncementRepository } from "../../persistence/repositories/mysql/AnnouncementRepository";
import { IAnnouncementService } from "../../../services/interfaces/IAnnouncementService";
import { AnnouncementService } from "../../../services/AnnouncementService";

export function registerAnnouncementDependencies() {
  container.register<IAnnouncementRepository>(
    "IAnnouncementRepository",
    AnnouncementRepository,
  );
  container.register<IAnnouncementService>(
    "IAnnouncementService",
    AnnouncementService,
  );
}
