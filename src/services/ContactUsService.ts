import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateContactUsDto,
  UpdateContactUsDto,
} from "../domain/dto/ContactUsDto";
import { ContactUs } from "../domain/entities/mysql/ContactUs";
import { Client } from "../domain/entities/mysql/Client";
import { User } from "../domain/entities/mysql/User";
import { Status } from "../domain/enums/status";
import { IContactUsRepository } from "../domain/repositories/mysql/IContactUsRepository";
import { AppError } from "../utils/errors";
import {
  ContactUsResponse,
  IContactUsService,
} from "./interfaces/IContactUsService";

@injectable()
export class ContactUsService implements IContactUsService {
  constructor(
    @inject("IContactUsRepository")
    private readonly contactUsRepository: IContactUsRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getContactUsList(): Promise<ContactUsResponse[]> {
    const list = await this.contactUsRepository.getContactUsList();
    return list.map((item) => this.toResponse(item));
  }

  async getContactUsById(externalId: string): Promise<ContactUsResponse> {
    const contactUs =
      await this.contactUsRepository.getContactUsById(externalId);
    if (!contactUs) {
      throw new AppError("Contact us entry not found", 404);
    }
    return this.toResponse(contactUs);
  }

  async createContactUs(
    payload: CreateContactUsDto,
    actorUserId?: number,
  ): Promise<ContactUsResponse> {
    const contactUs = new ContactUs();
    contactUs.name = payload.name;
    contactUs.mobile = payload.mobile;
    contactUs.email = payload.email;
    contactUs.status = payload.status ?? Status.ACTIVE;
    contactUs.reason = payload.reason ?? null;
    contactUs.createdBy = await this.findActor(actorUserId);

    return this.toResponse(
      await this.contactUsRepository.createContactUs(contactUs),
    );
  }

  async updateContactUs(
    externalId: string,
    payload: UpdateContactUsDto,
    actorUserId?: number,
  ): Promise<ContactUsResponse> {
    const contactUs =
      await this.contactUsRepository.getContactUsById(externalId);
    if (!contactUs) {
      throw new AppError("Contact us entry not found", 404);
    }

    const actor = await this.findActor(actorUserId);
    if (actor) contactUs.updatedBy = actor;
    if (payload.name !== undefined) contactUs.name = payload.name;
    if (payload.mobile !== undefined) contactUs.mobile = payload.mobile;
    if (payload.email !== undefined) contactUs.email = payload.email;
    if (payload.status !== undefined) contactUs.status = payload.status;
    if (payload.reason !== undefined) {
      contactUs.reason = payload.reason ?? null;
    }

    return this.toResponse(
      await this.contactUsRepository.updateContactUs(contactUs),
    );
  }

  async deleteContactUs(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.contactUsRepository.deleteContactUs(externalId, actor);
  }

  private async findActor(userId?: number): Promise<Client | undefined> {
    if (userId === undefined) return undefined;
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new AppError("Invalid user ID", 401);
    }

    const em = this.em.fork();
    const authUser = await em.findOne(User, {
      id: userId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!authUser) {
      throw new AppError("User not found", 401);
    }

    return (
      (await em.findOne(Client, {
        externalId: authUser.externalId,
        isDeleted: false,
        status: Status.ACTIVE,
      })) ?? undefined
    );
  }

  private toResponse(contactUs: ContactUs): ContactUsResponse {
    return {
      id: contactUs.externalId,
      name: contactUs.name,
      mobile: contactUs.mobile,
      email: contactUs.email,
      status: contactUs.status ?? null,
      reason: contactUs.reason ?? null,
      createdAt: contactUs.createdAt,
      updatedAt: contactUs.updatedAt,
      deletedAt: contactUs.deletedAt ?? null,
    };
  }
}
