import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateDriverDetailDto,
  UpdateDriverDetailDto,
} from "../domain/dto/DriverDetailDto";
import { Client } from "../domain/entities/mysql/Client";
import { DriverDetail } from "../domain/entities/mysql/DriverDetail";
import { Geofence } from "../domain/entities/mysql/Geofence";
import { License } from "../domain/entities/mysql/License";
import { Transporter } from "../domain/entities/mysql/Transporter";
import { Status } from "../domain/enums/status";
import { IDriverDetailRepository } from "../domain/repositories/mysql/IDriverDetailRepository";
import { AppError } from "../utils/errors";
import {
  DriverDetailResponse,
  IDriverDetailService,
} from "./interfaces/IDriverDetailService";

@injectable()
export class DriverDetailService implements IDriverDetailService {
  constructor(
    @inject("IDriverDetailRepository")
    private readonly driverDetailRepository: IDriverDetailRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getDriverDetails(): Promise<DriverDetailResponse[]> {
    const details = await this.driverDetailRepository.getDriverDetails();
    return details.map((detail) => this.toResponse(detail));
  }

  async getDriverDetailById(externalId: string): Promise<DriverDetailResponse> {
    const detail =
      await this.driverDetailRepository.getDriverDetailById(externalId);
    if (!detail) {
      throw new AppError("Driver detail not found", 404);
    }
    return this.toResponse(detail);
  }

  async createDriverDetail(
    payload: CreateDriverDetailDto,
    actorUserId?: number,
  ): Promise<DriverDetailResponse> {
    const [client, transporter, licenses, geofences, actor] = await Promise.all(
      [
        this.findClient(payload.client),
        this.findTransporter(payload.transporter),
        this.findLicenses(payload.licenseToDrive),
        this.findGeofences(payload.geofences),
        this.findActor(actorUserId),
      ],
    );

    const detail = new DriverDetail();
    detail.client = client;
    detail.transporter = transporter;
    detail.firstName = payload.firstName;
    detail.lastName = payload.lastName;
    detail.licenseToDrive.set(licenses);
    detail.geofences.set(geofences);
    detail.createdBy = actor;
    this.assignOptionalFields(detail, payload);
    return this.toResponse(
      await this.driverDetailRepository.createDriverDetail(detail),
    );
  }

  async updateDriverDetail(
    externalId: string,
    payload: UpdateDriverDetailDto,
    actorUserId?: number,
  ): Promise<DriverDetailResponse> {
    const detail =
      await this.driverDetailRepository.getDriverDetailById(externalId);
    if (!detail) {
      throw new AppError("Driver detail not found", 404);
    }

    const [client, transporter, licenses, geofences, actor] = await Promise.all(
      [
        payload.client ? this.findClient(payload.client) : detail.client,
        payload.transporter !== undefined
          ? this.findTransporter(payload.transporter)
          : detail.transporter,
        payload.licenseToDrive !== undefined
          ? this.findLicenses(payload.licenseToDrive)
          : detail.licenseToDrive.getItems(),
        payload.geofences !== undefined
          ? this.findGeofences(payload.geofences)
          : detail.geofences.getItems(),
        this.findActor(actorUserId),
      ],
    );

    detail.client = client;
    detail.transporter = transporter;
    detail.licenseToDrive.set(licenses);
    detail.geofences.set(geofences);
    detail.updatedBy = actor;
    this.assignOptionalFields(detail, payload);
    return this.toResponse(
      await this.driverDetailRepository.updateDriverDetail(detail),
    );
  }

  async deleteDriverDetail(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.driverDetailRepository.deleteDriverDetail(externalId, actor);
  }

  private async findClient(externalId: string): Promise<Client> {
    const client = await this.em.fork().findOne(Client, {
      externalId,
      isDeleted: false,
    });
    if (!client) {
      throw new AppError("Client not found", 404);
    }
    return client;
  }

  private async findTransporter(
    externalId?: string | null,
  ): Promise<Transporter | undefined> {
    if (!externalId) return undefined;
    const transporter = await this.em.fork().findOne(Transporter, {
      externalId,
      isDeleted: false,
    });
    if (!transporter) {
      throw new AppError("Transporter not found", 404);
    }
    return transporter;
  }

  private async findLicenses(externalIds?: string[]): Promise<License[]> {
    if (!externalIds?.length) return [];
    const licenses = await this.em.fork().find(License, {
      externalId: { $in: externalIds },
      isDeleted: false,
    });
    if (licenses.length !== new Set(externalIds).size) {
      throw new AppError("Invalid licenseToDrive externalId", 400);
    }
    return licenses;
  }

  private async findGeofences(externalIds?: string[]): Promise<Geofence[]> {
    if (!externalIds?.length) return [];
    const geofences = await this.em.fork().find(Geofence, {
      externalId: { $in: externalIds },
      isDeleted: false,
    });
    if (geofences.length !== new Set(externalIds).size) {
      throw new AppError("Invalid geofences externalId", 400);
    }
    return geofences;
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

  private assignOptionalFields(
    detail: DriverDetail,
    payload: CreateDriverDetailDto | UpdateDriverDetailDto,
  ): void {
    if (payload.firstName !== undefined) detail.firstName = payload.firstName;
    if (payload.lastName !== undefined) detail.lastName = payload.lastName;
    if (payload.deviceId !== undefined)
      detail.deviceId = payload.deviceId ?? undefined;
    if (payload.dateOfJoining !== undefined) {
      detail.dateOfJoining = this.toDate(payload.dateOfJoining);
    }
    if (payload.dateOfLeaving !== undefined) {
      detail.dateOfLeaving = this.toDate(payload.dateOfLeaving);
    }
    if (payload.dateOfBirth !== undefined) {
      detail.dateOfBirth = this.toDate(payload.dateOfBirth);
    }
    if (payload.experience !== undefined)
      detail.experience = payload.experience ?? undefined;
    if (payload.salary !== undefined)
      detail.salary = payload.salary ?? undefined;
    if (payload.phoneNumber !== undefined)
      detail.phoneNumber = payload.phoneNumber ?? undefined;
    if (payload.licenseNumber !== undefined)
      detail.licenseNumber = payload.licenseNumber ?? undefined;
    if (payload.licenseIssueDate !== undefined) {
      detail.licenseIssueDate = this.toDate(payload.licenseIssueDate);
    }
    if (payload.licenseExpiryDate !== undefined) {
      detail.licenseExpiryDate = this.toDate(payload.licenseExpiryDate);
    }
    if (payload.lifeInsuranceNumber !== undefined) {
      detail.lifeInsuranceNumber = payload.lifeInsuranceNumber ?? undefined;
    }
    if (payload.lifeInsuranceExpiryDate !== undefined) {
      detail.lifeInsuranceExpiryDate = this.toDate(
        payload.lifeInsuranceExpiryDate,
      );
    }
    if (payload.mediclaimNumber !== undefined) {
      detail.mediclaimNumber = payload.mediclaimNumber ?? undefined;
    }
    if (payload.mediclaimExpiryDate !== undefined) {
      detail.mediclaimExpiryDate = this.toDate(payload.mediclaimExpiryDate);
    }
    if (payload.bloodGroup !== undefined) {
      detail.bloodGroup = payload.bloodGroup ?? undefined;
    }
    if (payload.supervisorName !== undefined) {
      detail.supervisorName = payload.supervisorName ?? undefined;
    }
    if (payload.supervisorPhoneNumber !== undefined) {
      detail.supervisorPhoneNumber = payload.supervisorPhoneNumber ?? undefined;
    }
    if (payload.address !== undefined)
      detail.address = payload.address ?? undefined;
    if (payload.licenseAvailable !== undefined) {
      detail.licenseAvailable = payload.licenseAvailable;
    }
    if (payload.licenseVerified !== undefined) {
      detail.licenseVerified = payload.licenseVerified;
    }
    if (payload.enableGeoVerifiedAttendance !== undefined) {
      detail.enableGeoVerifiedAttendance = payload.enableGeoVerifiedAttendance;
    }
    if (payload.status !== undefined)
      detail.status = payload.status ?? undefined;
    if (payload.reason !== undefined)
      detail.reason = payload.reason ?? undefined;
  }

  private toDate(value?: string | null): Date | undefined {
    return value ? new Date(value) : undefined;
  }

  private toResponse(detail: DriverDetail): DriverDetailResponse {
    return {
      id: detail.externalId,
      client: {
        id: detail.client.externalId,
        name: detail.client.name ?? null,
        companyName: detail.client.companyName,
      },
      transporter: detail.transporter
        ? {
            id: detail.transporter.externalId,
            name: detail.transporter.name ?? null,
            companyName: detail.transporter.companyName,
          }
        : null,
      firstName: detail.firstName,
      lastName: detail.lastName,
      deviceId: detail.deviceId ?? null,
      dateOfJoining: detail.dateOfJoining ?? null,
      dateOfLeaving: detail.dateOfLeaving ?? null,
      dateOfBirth: detail.dateOfBirth ?? null,
      experience: detail.experience ?? null,
      salary: detail.salary ?? null,
      phoneNumber: detail.phoneNumber ?? null,
      licenseNumber: detail.licenseNumber ?? null,
      licenseToDrive: detail.licenseToDrive.getItems().map((license) => ({
        id: license.externalId,
        license: license.license,
      })),
      licenseIssueDate: detail.licenseIssueDate ?? null,
      licenseExpiryDate: detail.licenseExpiryDate ?? null,
      lifeInsuranceNumber: detail.lifeInsuranceNumber ?? null,
      lifeInsuranceExpiryDate: detail.lifeInsuranceExpiryDate ?? null,
      mediclaimNumber: detail.mediclaimNumber ?? null,
      mediclaimExpiryDate: detail.mediclaimExpiryDate ?? null,
      bloodGroup: detail.bloodGroup ?? null,
      supervisorName: detail.supervisorName ?? null,
      supervisorPhoneNumber: detail.supervisorPhoneNumber ?? null,
      address: detail.address ?? null,
      licenseAvailable: detail.licenseAvailable,
      licenseVerified: detail.licenseVerified,
      enableGeoVerifiedAttendance: detail.enableGeoVerifiedAttendance,
      geofences: detail.geofences.getItems().map((geofence) => ({
        id: geofence.externalId,
        name: geofence.name,
      })),
      status: detail.status ?? null,
      reason: detail.reason ?? null,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
    };
  }
}
