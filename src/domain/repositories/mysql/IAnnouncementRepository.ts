import { Announcement } from "../../entities/mysql/Announcement";
import { Client } from "../../entities/mysql/Client";

export interface IAnnouncementRepository {
  getAnnouncements(): Promise<Announcement[]>;
  getAnnouncementById(externalId: string): Promise<Announcement | null>;
  createAnnouncement(announcement: Announcement): Promise<Announcement>;
  updateAnnouncement(announcement: Announcement): Promise<Announcement>;
  deleteAnnouncement(externalId: string, deletedBy?: Client): Promise<void>;
}
