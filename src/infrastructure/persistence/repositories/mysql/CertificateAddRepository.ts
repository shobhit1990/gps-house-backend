import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { AddVehicle } from "../../../../domain/entities/mysql/AddVehicle";
import { CertificateAdd } from "../../../../domain/entities/mysql/CertificateAdd";
import { Client } from "../../../../domain/entities/mysql/Client";
import { District } from "../../../../domain/entities/mysql/District";
import { State } from "../../../../domain/entities/mysql/State";
import { ICertificateAddRepository } from "../../../../domain/repositories/mysql/ICertificateAddRepository";
import { AppError } from "../../../../utils/errors";

const populate = [
  "vehicleNumber",
  "rtoState",
  "rtoDistrict",
  "createdBy",
  "updatedBy",
  "deletedBy",
] as const;

@injectable()
export class CertificateAddRepository implements ICertificateAddRepository {
  constructor(private readonly em: EntityManager) {}

  async getCertificateAdds(): Promise<CertificateAdd[]> {
    return this.em
      .fork()
      .find(CertificateAdd, { isDeleted: false }, { populate: [...populate] });
  }

  async getCertificateAddById(
    externalId: string,
  ): Promise<CertificateAdd | null> {
    return this.em
      .fork()
      .findOne(
        CertificateAdd,
        { externalId, isDeleted: false },
        { populate: [...populate] },
      );
  }

  async createCertificateAdd(
    certificateAdd: CertificateAdd,
  ): Promise<CertificateAdd> {
    const em = this.em.fork();
    certificateAdd.vehicleNumber = em.getReference(
      AddVehicle,
      certificateAdd.vehicleNumber.id,
    );
    if (certificateAdd.rtoState) {
      certificateAdd.rtoState = em.getReference(
        State,
        certificateAdd.rtoState.id,
      );
    }
    if (certificateAdd.rtoDistrict) {
      certificateAdd.rtoDistrict = em.getReference(
        District,
        certificateAdd.rtoDistrict.id,
      );
    }
    if (certificateAdd.createdBy) {
      certificateAdd.createdBy = em.getReference(
        Client,
        certificateAdd.createdBy.id,
      );
    }
    await em.persistAndFlush(certificateAdd);
    await em.populate(certificateAdd, [...populate]);
    return certificateAdd;
  }

  async updateCertificateAdd(
    certificateAdd: CertificateAdd,
  ): Promise<CertificateAdd> {
    const em = this.em.fork();
    const existing = await em.findOne(
      CertificateAdd,
      { externalId: certificateAdd.externalId, isDeleted: false },
      { populate: [...populate] },
    );
    if (!existing) {
      throw new AppError("Certificate add not found", 404);
    }

    em.assign(existing, {
      ...this.getEditableFields(certificateAdd),
      vehicleNumber: em.getReference(
        AddVehicle,
        certificateAdd.vehicleNumber.id,
      ),
      rtoState: certificateAdd.rtoState
        ? em.getReference(State, certificateAdd.rtoState.id)
        : null,
      rtoDistrict: certificateAdd.rtoDistrict
        ? em.getReference(District, certificateAdd.rtoDistrict.id)
        : null,
      ...(certificateAdd.updatedBy
        ? { updatedBy: em.getReference(Client, certificateAdd.updatedBy.id) }
        : {}),
      updatedAt: new Date(),
    });
    await em.flush();
    await em.populate(existing, [...populate]);
    return existing;
  }

  async deleteCertificateAdd(
    externalId: string,
    deletedBy?: Client,
  ): Promise<void> {
    const em = this.em.fork();
    const certificateAdd = await em.findOne(CertificateAdd, {
      externalId,
      isDeleted: false,
    });
    if (!certificateAdd) {
      throw new AppError("Certificate add not found", 404);
    }

    const now = new Date();
    certificateAdd.isDeleted = true;
    certificateAdd.deletedAt = now;
    certificateAdd.updatedAt = now;
    if (deletedBy) {
      certificateAdd.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }

  private getEditableFields(
    certificateAdd: CertificateAdd,
  ): Omit<
    CertificateAdd,
    | "id"
    | "externalId"
    | "vehicleNumber"
    | "rtoState"
    | "rtoDistrict"
    | "createdBy"
    | "updatedBy"
    | "deletedBy"
    | "isDeleted"
    | "createdAt"
    | "updatedAt"
    | "deletedAt"
  > {
    const {
      id: _id,
      externalId: _externalId,
      vehicleNumber: _vehicleNumber,
      rtoState: _rtoState,
      rtoDistrict: _rtoDistrict,
      createdBy: _createdBy,
      updatedBy: _updatedBy,
      deletedBy: _deletedBy,
      isDeleted: _isDeleted,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      deletedAt: _deletedAt,
      ...fields
    } = certificateAdd;
    return fields;
  }
}
