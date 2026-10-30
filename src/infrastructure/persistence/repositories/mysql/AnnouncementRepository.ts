import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { Announcement } from "../../../../domain/entities/mysql/Announcement";
import { Client } from "../../../../domain/entities/mysql/Client";
import { Transporter } from "../../../../domain/entities/mysql/Transporter";
import { IAnnouncementRepository } from "../../../../domain/repositories/mysql/IAnnouncementRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class AnnouncementRepository implements IAnnouncementRepository {
  constructor(private readonly em: EntityManager) {}

  async getAnnouncements(): Promise<Announcement[]> {
    return this.em.fork().find(
      Announcement,
      { isDeleted: false },
      {
        populate: ["client", "transporter"],
      },
    );
  }

  async getAnnouncementById(externalId: string): Promise<Announcement | null> {
    return this.em
      .fork()
      .findOne(
        Announcement,
        { externalId, isDeleted: false },
        { populate: ["client", "transporter"] },
      );
  }

  async createAnnouncement(announcement: Announcement): Promise<Announcement> {
    const em = this.em.fork();
    announcement.client = em.getReference(Client, announcement.client.id);
    if (announcement.transporter) {
      announcement.transporter = em.getReference(
        Transporter,
        announcement.transporter.id,
      );
    }
    if (announcement.createdBy) {
      announcement.createdBy = em.getReference(
        Client,
        announcement.createdBy.id,
      );
    }
    await em.persistAndFlush(announcement);
    await em.populate(announcement, ["client", "transporter"]);
    return announcement;
  }

  async updateAnnouncement(announcement: Announcement): Promise<Announcement> {
    const em = this.em.fork();
    const existing = await em.findOne(
      Announcement,
      { externalId: announcement.externalId, isDeleted: false },
      { populate: ["client", "transporter"] },
    );
    if (!existing) {
      throw new AppError("Announcement not found", 404);
    }

    em.assign(existing, {
      announcement: announcement.announcement,
      client: em.getReference(Client, announcement.client.id),
      transporter: announcement.transporter
        ? em.getReference(Transporter, announcement.transporter.id)
        : null,
      validityTime: announcement.validityTime,
      validityDuration: announcement.validityDuration,
      messageType: announcement.messageType,
      title: announcement.title,
      body: announcement.body ?? null,
      messageImage: announcement.messageImage ?? null,
      requestForDontShowAgainOption: announcement.requestForDontShowAgainOption,
      requestForProfileUpdate: announcement.requestForProfileUpdate,
      status: announcement.status ?? null,
      reason: announcement.reason ?? null,
      ...(announcement.updatedBy
        ? { updatedBy: em.getReference(Client, announcement.updatedBy.id) }
        : {}),
      updatedAt: new Date(),
    });
    await em.flush();
    await em.populate(existing, ["client", "transporter"]);
    return existing;
  }

  async deleteAnnouncement(
    externalId: string,
    deletedBy?: Client,
  ): Promise<void> {
    const em = this.em.fork();
    const announcement = await em.findOne(Announcement, {
      externalId,
      isDeleted: false,
    });
    if (!announcement) {
      throw new AppError("Announcement not found", 404);
    }

    const now = new Date();
    announcement.isDeleted = true;
    announcement.deletedAt = now;
    announcement.updatedAt = now;
    if (deletedBy) {
      announcement.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }
}
