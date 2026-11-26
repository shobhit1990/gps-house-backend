import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { ContactUs } from "../../../../domain/entities/mysql/ContactUs";
import { Client } from "../../../../domain/entities/mysql/Client";
import { IContactUsRepository } from "../../../../domain/repositories/mysql/IContactUsRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class ContactUsRepository implements IContactUsRepository {
  constructor(private readonly em: EntityManager) {}

  async getContactUsList(): Promise<ContactUs[]> {
    return this.em.fork().find(ContactUs, { isDeleted: false });
  }

  async getContactUsById(externalId: string): Promise<ContactUs | null> {
    return this.em
      .fork()
      .findOne(ContactUs, { externalId, isDeleted: false });
  }

  async createContactUs(contactUs: ContactUs): Promise<ContactUs> {
    const em = this.em.fork();
    if (contactUs.createdBy) {
      contactUs.createdBy = em.getReference(Client, contactUs.createdBy.id);
    }
    await em.persistAndFlush(contactUs);
    return contactUs;
  }

  async updateContactUs(contactUs: ContactUs): Promise<ContactUs> {
    const em = this.em.fork();
    const existing = await em.findOne(ContactUs, {
      externalId: contactUs.externalId,
      isDeleted: false,
    });
    if (!existing) {
      throw new AppError("Contact us entry not found", 404);
    }

    em.assign(existing, {
      name: contactUs.name,
      mobile: contactUs.mobile,
      email: contactUs.email,
      status: contactUs.status,
      reason: contactUs.reason,
      ...(contactUs.updatedBy
        ? { updatedBy: em.getReference(Client, contactUs.updatedBy.id) }
        : {}),
      updatedAt: new Date(),
    });
    await em.flush();
    return existing;
  }

  async deleteContactUs(
    externalId: string,
    deletedBy?: Client,
  ): Promise<void> {
    const em = this.em.fork();
    const contactUs = await em.findOne(ContactUs, {
      externalId,
      isDeleted: false,
    });
    if (!contactUs) {
      throw new AppError("Contact us entry not found", 404);
    }

    const now = new Date();
    contactUs.isDeleted = true;
    contactUs.deletedAt = now;
    contactUs.updatedAt = now;
    if (deletedBy) {
      contactUs.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }
}
