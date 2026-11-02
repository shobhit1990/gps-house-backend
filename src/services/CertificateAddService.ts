import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CertificateAddFields,
  CreateCertificateAddDto,
  UpdateCertificateAddDto,
} from "../domain/dto/CertificateAddDto";
import { AddVehicle } from "../domain/entities/mysql/AddVehicle";
import { CertificateAdd } from "../domain/entities/mysql/CertificateAdd";
import { Client } from "../domain/entities/mysql/Client";
import { District } from "../domain/entities/mysql/District";
import { State } from "../domain/entities/mysql/State";
import { Status } from "../domain/enums/status";
import { ICertificateAddRepository } from "../domain/repositories/mysql/ICertificateAddRepository";
import { AppError } from "../utils/errors";
import { toPublicFileUrl } from "../utils/fileUpload";
import {
  CertificateAddResponse,
  ICertificateAddService,
} from "./interfaces/ICertificateAddService";

const editableFields = [
  "numberOfSos",
  "deviceInstallationDate",
  "chassisNumber",
  "manufacturingCompany",
  "vehicleManufacturingDate",
  "registrationDate",
  "engineNumber",
  "lastFitnessDate",
  "vehicleModel",
  "customerName",
  "customerAddress",
  "dealerName",
  "dealerAddress",
  "vtdModel",
  "vtdUniqueId",
  "invoiceNumber",
  "invoiceDate",
  "simIccidNumber",
  "ideaNumber",
  "bsnlNumber",
  "dueDate",
  "fitmentImage1",
  "fitmentImage2",
  "fitmentImage3",
  "fitmentImage4",
  "vendorLogo1",
  "vendorLogo2",
  "name",
  "surname",
  "fatherName",
  "panNumber",
  "aadhaarNo",
  "remark",
  "pancardLogo",
  "aadhaarFront",
  "aadhaarBack",
  "status",
  "reason",
] as const satisfies readonly (keyof CertificateAddFields)[];

const dateFields = new Set<keyof CertificateAddFields>([
  "deviceInstallationDate",
  "vehicleManufacturingDate",
  "registrationDate",
  "lastFitnessDate",
  "invoiceDate",
  "dueDate",
]);

@injectable()
export class CertificateAddService implements ICertificateAddService {
  constructor(
    @inject("ICertificateAddRepository")
    private readonly repository: ICertificateAddRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getCertificateAdds(): Promise<CertificateAddResponse[]> {
    const certificateAdds = await this.repository.getCertificateAdds();
    return certificateAdds.map((certificateAdd) =>
      this.toResponse(certificateAdd),
    );
  }

  async getCertificateAddById(
    externalId: string,
  ): Promise<CertificateAddResponse> {
    const certificateAdd =
      await this.repository.getCertificateAddById(externalId);
    if (!certificateAdd) {
      throw new AppError("Certificate add not found", 404);
    }
    return this.toResponse(certificateAdd);
  }

  async createCertificateAdd(
    payload: CreateCertificateAddDto,
    actorUserId?: number,
  ): Promise<CertificateAddResponse> {
    const [vehicleNumber, location, actor] = await Promise.all([
      this.findVehicle(payload.vehicleNumber),
      this.resolveLocation(payload.rtoState, payload.rtoDistrict),
      this.findActor(actorUserId),
    ]);

    const certificateAdd = new CertificateAdd();
    certificateAdd.vehicleNumber = vehicleNumber;
    certificateAdd.rtoState = location.state;
    certificateAdd.rtoDistrict = location.district;
    certificateAdd.createdBy = actor;
    this.assignFields(certificateAdd, payload);
    return this.toResponse(
      await this.repository.createCertificateAdd(certificateAdd),
    );
  }

  async updateCertificateAdd(
    externalId: string,
    payload: UpdateCertificateAddDto,
    actorUserId?: number,
  ): Promise<CertificateAddResponse> {
    if (Object.keys(payload).length === 0) {
      throw new AppError(
        "At least one field is required to update a certificate",
        400,
      );
    }
    const certificateAdd =
      await this.repository.getCertificateAddById(externalId);
    if (!certificateAdd) {
      throw new AppError("Certificate add not found", 404);
    }

    if (payload.vehicleNumber !== undefined) {
      certificateAdd.vehicleNumber = await this.findVehicle(
        payload.vehicleNumber,
      );
    }

    const stateId =
      payload.rtoState !== undefined
        ? payload.rtoState
        : certificateAdd.rtoState?.externalId;
    const districtId =
      payload.rtoDistrict !== undefined
        ? payload.rtoDistrict
        : certificateAdd.rtoDistrict?.externalId;
    const location = await this.resolveLocation(stateId, districtId);
    certificateAdd.rtoState = location.state;
    certificateAdd.rtoDistrict = location.district;

    this.assignFields(certificateAdd, payload);
    const actor = await this.findActor(actorUserId);
    if (actor) certificateAdd.updatedBy = actor;

    return this.toResponse(
      await this.repository.updateCertificateAdd(certificateAdd),
    );
  }

  async deleteCertificateAdd(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.repository.deleteCertificateAdd(externalId, actor);
  }

  private assignFields(
    certificateAdd: CertificateAdd,
    payload: CreateCertificateAddDto | UpdateCertificateAddDto,
  ): void {
    const fields: Partial<CertificateAddFields> = payload;
    for (const field of editableFields) {
      const value = fields[field];
      if (value === undefined) continue;
      if (dateFields.has(field)) {
        Object.assign(certificateAdd, {
          [field]:
            value === null
              ? null
              : typeof value === "string"
                ? new Date(value)
                : value,
        });
      } else {
        Object.assign(certificateAdd, { [field]: value });
      }
    }
  }

  private async findVehicle(externalId: string): Promise<AddVehicle> {
    const vehicle = await this.em.fork().findOne(AddVehicle, {
      externalId,
      isDeleted: false,
    });
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }
    return vehicle;
  }

  private async resolveLocation(
    stateId?: string | null,
    districtId?: string | null,
  ): Promise<{ state: State | null; district: District | null }> {
    const em = this.em.fork();
    const [state, district] = await Promise.all([
      stateId
        ? em.findOne(State, { externalId: stateId, isDeleted: false })
        : null,
      districtId
        ? em.findOne(
            District,
            { externalId: districtId, isDeleted: false },
            { populate: ["state"] },
          )
        : null,
    ]);

    if (stateId && !state) {
      throw new AppError("RTO state not found", 404);
    }
    if (districtId && !district) {
      throw new AppError("RTO district not found", 404);
    }
    if (district && state && district.state.id !== state.id) {
      throw new AppError(
        "RTO district does not belong to the selected state",
        400,
      );
    }
    return { state: state ?? district?.state ?? null, district };
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

  private toResponse(certificateAdd: CertificateAdd): CertificateAddResponse {
    return {
      id: certificateAdd.externalId,
      vehicleNumber: {
        id: certificateAdd.vehicleNumber.externalId,
        vehicle: certificateAdd.vehicleNumber.vehicle,
      },
      numberOfSos: certificateAdd.numberOfSos ?? null,
      deviceInstallationDate: certificateAdd.deviceInstallationDate ?? null,
      chassisNumber: certificateAdd.chassisNumber ?? null,
      manufacturingCompany: certificateAdd.manufacturingCompany ?? null,
      vehicleManufacturingDate: certificateAdd.vehicleManufacturingDate ?? null,
      registrationDate: certificateAdd.registrationDate ?? null,
      engineNumber: certificateAdd.engineNumber ?? null,
      lastFitnessDate: certificateAdd.lastFitnessDate ?? null,
      vehicleModel: certificateAdd.vehicleModel ?? null,
      customerName: certificateAdd.customerName ?? null,
      customerAddress: certificateAdd.customerAddress ?? null,
      dealerName: certificateAdd.dealerName ?? null,
      dealerAddress: certificateAdd.dealerAddress ?? null,
      vtdModel: certificateAdd.vtdModel ?? null,
      vtdUniqueId: certificateAdd.vtdUniqueId ?? null,
      invoiceNumber: certificateAdd.invoiceNumber ?? null,
      invoiceDate: certificateAdd.invoiceDate ?? null,
      simIccidNumber: certificateAdd.simIccidNumber ?? null,
      ideaNumber: certificateAdd.ideaNumber ?? null,
      bsnlNumber: certificateAdd.bsnlNumber ?? null,
      rtoState: certificateAdd.rtoState
        ? {
            id: certificateAdd.rtoState.externalId,
            stateCode: certificateAdd.rtoState.stateCode,
            stateName: certificateAdd.rtoState.stateName,
          }
        : null,
      rtoDistrict: certificateAdd.rtoDistrict
        ? {
            id: certificateAdd.rtoDistrict.externalId,
            districtCode: certificateAdd.rtoDistrict.districtCode,
            districtName: certificateAdd.rtoDistrict.districtName,
          }
        : null,
      dueDate: certificateAdd.dueDate ?? null,
      fitmentImage1: toPublicFileUrl(certificateAdd.fitmentImage1),
      fitmentImage2: toPublicFileUrl(certificateAdd.fitmentImage2),
      fitmentImage3: toPublicFileUrl(certificateAdd.fitmentImage3),
      fitmentImage4: toPublicFileUrl(certificateAdd.fitmentImage4),
      vendorLogo1: toPublicFileUrl(certificateAdd.vendorLogo1),
      vendorLogo2: toPublicFileUrl(certificateAdd.vendorLogo2),
      name: certificateAdd.name ?? null,
      surname: certificateAdd.surname ?? null,
      fatherName: certificateAdd.fatherName ?? null,
      panNumber: certificateAdd.panNumber ?? null,
      aadhaarNo: certificateAdd.aadhaarNo ?? null,
      remark: certificateAdd.remark ?? null,
      pancardLogo: toPublicFileUrl(certificateAdd.pancardLogo),
      aadhaarFront: toPublicFileUrl(certificateAdd.aadhaarFront),
      aadhaarBack: toPublicFileUrl(certificateAdd.aadhaarBack),
      status: certificateAdd.status ?? null,
      reason: certificateAdd.reason ?? null,
      createdAt: certificateAdd.createdAt,
      updatedAt: certificateAdd.updatedAt,
    };
  }
}
