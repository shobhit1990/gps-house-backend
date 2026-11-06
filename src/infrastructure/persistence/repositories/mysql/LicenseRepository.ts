import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { Client } from "../../../../domain/entities/mysql/Client";
import { License } from "../../../../domain/entities/mysql/License";
import { ILicenseRepository } from "../../../../domain/repositories/mysql/ILicenseRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class LicenseRepository implements ILicenseRepository {
  constructor(private readonly em: EntityManager) {}

  async getLicenses(): Promise<License[]> {
    return this.em.fork().find(License, { isDeleted: false });
  }

  async getLicenseById(externalId: string): Promise<License | null> {
    return this.em.fork().findOne(License, {
      externalId,
      isDeleted: false,
    });
  }

  async createLicense(license: License): Promise<License> {
    const em = this.em.fork();
    if (license.createdBy) {
      license.createdBy = em.getReference(Client, license.createdBy.id);
    }
    await em.persistAndFlush(license);
    return license;
  }

  async updateLicense(license: License): Promise<License> {
    const em = this.em.fork();
    const existing = await em.findOne(License, {
      externalId: license.externalId,
      isDeleted: false,
    });
    if (!existing) {
      throw new AppError("License not found", 404);
    }

    em.assign(existing, {
      license: license.license,
      status: license.status,
      reason: license.reason,
      ...(license.updatedBy
        ? { updatedBy: em.getReference(Client, license.updatedBy.id) }
        : {}),
    });
    await em.flush();
    return existing;
  }

  async deleteLicense(externalId: string, deletedBy?: Client): Promise<void> {
    const em = this.em.fork();
    const license = await em.findOne(License, {
      externalId,
      isDeleted: false,
    });
    if (!license) {
      throw new AppError("License not found", 404);
    }

    license.isDeleted = true;
    license.deletedAt = new Date();
    if (deletedBy) {
      license.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }
}
