import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import { CreateLicenseDto, UpdateLicenseDto } from "../domain/dto/LicenseDto";
import { Client } from "../domain/entities/mysql/Client";
import { License } from "../domain/entities/mysql/License";
import { Status } from "../domain/enums/status";
import { ILicenseRepository } from "../domain/repositories/mysql/ILicenseRepository";
import { AppError } from "../utils/errors";
import { ILicenseService, LicenseResponse } from "./interfaces/ILicenseService";

@injectable()
export class LicenseService implements ILicenseService {
  constructor(
    @inject("ILicenseRepository")
    private readonly licenseRepository: ILicenseRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getLicenses(): Promise<LicenseResponse[]> {
    const licenses = await this.licenseRepository.getLicenses();
    return licenses.map((license) => this.toResponse(license));
  }

  async getLicenseById(externalId: string): Promise<LicenseResponse> {
    const license = await this.licenseRepository.getLicenseById(externalId);
    if (!license) {
      throw new AppError("License not found", 404);
    }
    return this.toResponse(license);
  }

  async createLicense(
    payload: CreateLicenseDto,
    actorUserId?: number,
  ): Promise<LicenseResponse> {
    const license = new License();
    license.license = payload.license;
    license.createdBy = await this.findActor(actorUserId);
    const savedLicense = await this.licenseRepository.createLicense(license);
    return this.toResponse(savedLicense);
  }

  async updateLicense(
    externalId: string,
    payload: UpdateLicenseDto,
    actorUserId?: number,
  ): Promise<LicenseResponse> {
    const license = await this.licenseRepository.getLicenseById(externalId);
    if (!license) {
      throw new AppError("License not found", 404);
    }

    if (payload.license !== undefined) license.license = payload.license;
    if (payload.status !== undefined) license.status = payload.status;
    if (payload.reason !== undefined) license.reason = payload.reason;
    license.updatedBy = await this.findActor(actorUserId);
    const updatedLicense = await this.licenseRepository.updateLicense(license);
    return this.toResponse(updatedLicense);
  }

  async deleteLicense(externalId: string, actorUserId?: number): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.licenseRepository.deleteLicense(externalId, actor);
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
    if (!actor) {
      throw new AppError("User not found", 401);
    }
    return actor;
  }

  private toResponse(license: License): LicenseResponse {
    return {
      id: license.externalId,
      license: license.license,
      status: license.status,
      reason: license.reason ?? null,
    };
  }
}
