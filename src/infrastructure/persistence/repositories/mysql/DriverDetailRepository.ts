import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { Client } from "../../../../domain/entities/mysql/Client";
import { DriverDetail } from "../../../../domain/entities/mysql/DriverDetail";
import { Geofence } from "../../../../domain/entities/mysql/Geofence";
import { License } from "../../../../domain/entities/mysql/License";
import { Transporter } from "../../../../domain/entities/mysql/Transporter";
import { IDriverDetailRepository } from "../../../../domain/repositories/mysql/IDriverDetailRepository";
import { AppError } from "../../../../utils/errors";

const populate = [
  "client",
  "transporter",
  "licenseToDrive",
  "geofences",
] as const;

@injectable()
export class DriverDetailRepository implements IDriverDetailRepository {
  constructor(private readonly em: EntityManager) {}

  async getDriverDetails(): Promise<DriverDetail[]> {
    return this.em
      .fork()
      .find(DriverDetail, { isDeleted: false }, { populate: [...populate] });
  }

  async getDriverDetailById(externalId: string): Promise<DriverDetail | null> {
    return this.em
      .fork()
      .findOne(
        DriverDetail,
        { externalId, isDeleted: false },
        { populate: [...populate] },
      );
  }

  async createDriverDetail(driverDetail: DriverDetail): Promise<DriverDetail> {
    const em = this.em.fork();
    driverDetail.client = em.getReference(Client, driverDetail.client.id);
    if (driverDetail.transporter) {
      driverDetail.transporter = em.getReference(
        Transporter,
        driverDetail.transporter.id,
      );
    }
    if (driverDetail.createdBy) {
      driverDetail.createdBy = em.getReference(
        Client,
        driverDetail.createdBy.id,
      );
    }
    driverDetail.licenseToDrive.set(
      driverDetail.licenseToDrive
        .getItems()
        .map((license) => em.getReference(License, license.id)),
    );
    driverDetail.geofences.set(
      driverDetail.geofences
        .getItems()
        .map((geofence) => em.getReference(Geofence, geofence.id)),
    );

    await em.persistAndFlush(driverDetail);
    await em.populate(driverDetail, [...populate]);
    return driverDetail;
  }

  async updateDriverDetail(driverDetail: DriverDetail): Promise<DriverDetail> {
    const em = this.em.fork();
    const existing = await em.findOne(
      DriverDetail,
      { externalId: driverDetail.externalId, isDeleted: false },
      { populate: [...populate] },
    );
    if (!existing) {
      throw new AppError("Driver detail not found", 404);
    }

    existing.client = em.getReference(Client, driverDetail.client.id);
    existing.transporter = driverDetail.transporter
      ? em.getReference(Transporter, driverDetail.transporter.id)
      : undefined;
    existing.licenseToDrive.set(
      driverDetail.licenseToDrive
        .getItems()
        .map((license) => em.getReference(License, license.id)),
    );
    existing.geofences.set(
      driverDetail.geofences
        .getItems()
        .map((geofence) => em.getReference(Geofence, geofence.id)),
    );

    em.assign(existing, {
      firstName: driverDetail.firstName,
      lastName: driverDetail.lastName,
      deviceId: driverDetail.deviceId,
      dateOfJoining: driverDetail.dateOfJoining,
      dateOfLeaving: driverDetail.dateOfLeaving,
      dateOfBirth: driverDetail.dateOfBirth,
      experience: driverDetail.experience,
      salary: driverDetail.salary,
      phoneNumber: driverDetail.phoneNumber,
      licenseNumber: driverDetail.licenseNumber,
      licenseIssueDate: driverDetail.licenseIssueDate,
      licenseExpiryDate: driverDetail.licenseExpiryDate,
      lifeInsuranceNumber: driverDetail.lifeInsuranceNumber,
      lifeInsuranceExpiryDate: driverDetail.lifeInsuranceExpiryDate,
      mediclaimNumber: driverDetail.mediclaimNumber,
      mediclaimExpiryDate: driverDetail.mediclaimExpiryDate,
      bloodGroup: driverDetail.bloodGroup,
      supervisorName: driverDetail.supervisorName,
      supervisorPhoneNumber: driverDetail.supervisorPhoneNumber,
      address: driverDetail.address,
      licenseAvailable: driverDetail.licenseAvailable,
      licenseVerified: driverDetail.licenseVerified,
      enableGeoVerifiedAttendance: driverDetail.enableGeoVerifiedAttendance,
      status: driverDetail.status,
      reason: driverDetail.reason,
      ...(driverDetail.updatedBy
        ? { updatedBy: em.getReference(Client, driverDetail.updatedBy.id) }
        : {}),
      updatedAt: new Date(),
    });

    await em.flush();
    await em.populate(existing, [...populate]);
    return existing;
  }

  async deleteDriverDetail(
    externalId: string,
    deletedBy?: Client,
  ): Promise<void> {
    const em = this.em.fork();
    const driverDetail = await em.findOne(DriverDetail, {
      externalId,
      isDeleted: false,
    });
    if (!driverDetail) {
      throw new AppError("Driver detail not found", 404);
    }

    driverDetail.isDeleted = true;
    driverDetail.deletedAt = new Date();
    if (deletedBy) {
      driverDetail.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }
}
