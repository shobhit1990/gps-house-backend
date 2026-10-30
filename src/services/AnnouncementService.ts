import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from "../domain/dto/AnnouncementDto";
import { Announcement } from "../domain/entities/mysql/Announcement";
import { Client } from "../domain/entities/mysql/Client";
import { Transporter } from "../domain/entities/mysql/Transporter";
import { AnnounceMent } from "../domain/enums/AnnounceMent";
import { messageType } from "../domain/enums/MessageType";
import { Status } from "../domain/enums/status";
import { Validity } from "../domain/enums/Validity";
import { IAnnouncementRepository } from "../domain/repositories/mysql/IAnnouncementRepository";
import { AppError } from "../utils/errors";
import { toPublicFileUrl } from "../utils/fileUpload";
import {
  AnnouncementResponse,
  IAnnouncementService,
} from "./interfaces/IAnnouncementService";

@injectable()
export class AnnouncementService implements IAnnouncementService {
  constructor(
    @inject("IAnnouncementRepository")
    private readonly repository: IAnnouncementRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getAnnouncements(): Promise<AnnouncementResponse[]> {
    const announcements = await this.repository.getAnnouncements();
    return announcements.map((announcement) => this.toResponse(announcement));
  }

  async getAnnouncementById(externalId: string): Promise<AnnouncementResponse> {
    const announcement = await this.repository.getAnnouncementById(externalId);
    if (!announcement) throw new AppError("Announcement not found", 404);
    return this.toResponse(announcement);
  }

  async createAnnouncement(
    payload: CreateAnnouncementDto,
    actorUserId?: number,
    messageImage?: string,
  ): Promise<AnnouncementResponse> {
    const recipient = await this.resolveRecipient(
      payload.announcement,
      payload.client,
      payload.transporter,
      payload.transporter !== undefined,
    );
    const content = this.resolveContent(
      payload.messageType,
      payload.title,
      payload.body,
      messageImage,
    );
    const actor = await this.findActor(actorUserId);

    const announcement = new Announcement();
    announcement.announcement = payload.announcement;
    announcement.client = recipient.client;
    announcement.transporter = recipient.transporter;
    announcement.validityTime = payload.validityTime;
    announcement.validityDuration = payload.validityDuration;
    announcement.messageType = payload.messageType;
    announcement.title = content.title;
    announcement.body = content.body;
    announcement.messageImage = content.messageImage;
    announcement.requestForDontShowAgainOption =
      payload.requestForDontShowAgainOption ?? false;
    announcement.requestForProfileUpdate =
      payload.requestForProfileUpdate ?? false;
    announcement.status = payload.status ?? Status.ACTIVE;
    announcement.reason = payload.reason ?? null;
    announcement.createdBy = actor;

    return this.toResponse(
      await this.repository.createAnnouncement(announcement),
    );
  }

  async updateAnnouncement(
    externalId: string,
    payload: UpdateAnnouncementDto,
    actorUserId?: number,
    messageImage?: string,
  ): Promise<AnnouncementResponse> {
    if (Object.keys(payload).length === 0 && messageImage === undefined) {
      throw new AppError(
        "At least one field is required to update an announcement",
        400,
      );
    }
    const existing = await this.repository.getAnnouncementById(externalId);
    if (!existing) throw new AppError("Announcement not found", 404);

    const announcementType = payload.announcement ?? existing.announcement;
    const clientId = payload.client ?? existing.client.externalId;
    const transporterId =
      payload.transporter ?? existing.transporter?.externalId;
    const recipient = await this.resolveRecipient(
      announcementType,
      clientId,
      transporterId,
      payload.transporter !== undefined,
    );

    const nextMessageType = payload.messageType ?? existing.messageType;
    const title = payload.title ?? existing.title;
    const body = payload.body !== undefined ? payload.body : existing.body;
    const image =
      messageImage !== undefined ? messageImage : existing.messageImage;
    const content = this.resolveContent(
      nextMessageType,
      title,
      body ?? undefined,
      image ?? undefined,
    );
    const actor = await this.findActor(actorUserId);

    existing.announcement = announcementType;
    existing.client = recipient.client;
    existing.transporter = recipient.transporter;
    existing.validityTime = payload.validityTime ?? existing.validityTime;
    existing.validityDuration =
      payload.validityDuration ?? existing.validityDuration;
    existing.messageType = nextMessageType;
    existing.title = content.title;
    existing.body = content.body;
    existing.messageImage = content.messageImage;
    if (payload.requestForDontShowAgainOption !== undefined) {
      existing.requestForDontShowAgainOption =
        payload.requestForDontShowAgainOption;
    }
    if (payload.requestForProfileUpdate !== undefined) {
      existing.requestForProfileUpdate = payload.requestForProfileUpdate;
    }
    if (payload.status !== undefined) existing.status = payload.status;
    if (payload.reason !== undefined) existing.reason = payload.reason;
    if (actor) existing.updatedBy = actor;

    return this.toResponse(await this.repository.updateAnnouncement(existing));
  }

  async deleteAnnouncement(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.repository.deleteAnnouncement(externalId, actor);
  }

  private async resolveRecipient(
    announcement: AnnounceMent,
    clientId: string,
    transporterId?: string,
    transporterWasSent = false,
  ): Promise<{ client: Client; transporter: Transporter | null }> {
    const em = this.em.fork();
    const client = await em.findOne(Client, {
      externalId: clientId,
      isDeleted: false,
    });
    if (!client) throw new AppError("Client not found", 404);
    if (client.status !== Status.ACTIVE) {
      throw new AppError("Client is inactive", 400);
    }

    if (announcement === AnnounceMent.CLIENT) {
      if (transporterWasSent) {
        throw new AppError(
          "transporter must not be provided for client announcements",
          400,
        );
      }
      return { client, transporter: null };
    }

    if (!transporterId) {
      throw new AppError(
        "transporter is required for transporter announcements",
        400,
      );
    }
    const transporter = await em.findOne(Transporter, {
      externalId: transporterId,
      isDeleted: false,
    });
    if (!transporter) throw new AppError("Transporter not found", 404);
    if (transporter.status !== Status.ACTIVE) {
      throw new AppError("Transporter is inactive", 400);
    }
    return { client, transporter };
  }

  private resolveContent(
    type: messageType,
    title: string,
    body?: string,
    image?: string,
  ): { title: string; body: string | null; messageImage: string | null } {
    if (!title.trim()) throw new AppError("title is required", 400);

    if (type === messageType.TEXT) {
      if (!body?.trim()) {
        throw new AppError("body is required for text announcements", 400);
      }
      return { title, body, messageImage: null };
    }
    if (type === messageType.IMAGE) {
      if (!image) {
        throw new AppError(
          "messageImage is required for image announcements",
          400,
        );
      }
      return { title, body: null, messageImage: image };
    }
    throw new AppError("Invalid messageType", 400);
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

  private toResponse(announcement: Announcement): AnnouncementResponse {
    return {
      id: announcement.externalId,
      announcement: announcement.announcement,
      client: {
        id: announcement.client.externalId,
        name: announcement.client.name ?? "",
      },
      transporter: announcement.transporter
        ? {
            id: announcement.transporter.externalId,
            companyName: announcement.transporter.companyName,
          }
        : null,
      validityTime: announcement.validityTime,
      validityDuration: announcement.validityDuration,
      messageType: announcement.messageType,
      title: announcement.title,
      body: announcement.body ?? null,
      messageImage: toPublicFileUrl(announcement.messageImage),
      requestForDontShowAgainOption: announcement.requestForDontShowAgainOption,
      requestForProfileUpdate: announcement.requestForProfileUpdate,
      status: announcement.status ?? null,
      reason: announcement.reason ?? null,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
    };
  }
}
