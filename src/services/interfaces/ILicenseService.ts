import {
  CreateLicenseDto,
  UpdateLicenseDto,
} from "../../domain/dto/LicenseDto";
export interface LicenseResponse {
  id: string;
  license: string;
  status: string;
  reason: string | null;
}

export interface ILicenseService {
  getLicenses(): Promise<LicenseResponse[]>;

  getLicenseById(externalId: string): Promise<LicenseResponse>;

  createLicense(
    payload: CreateLicenseDto,
    actorExternalId?: string,
  ): Promise<LicenseResponse>;

  updateLicense(
    externalId: string,
    payload: UpdateLicenseDto,
    actorExternalId?: string,
  ): Promise<LicenseResponse>;

  deleteLicense(externalId: string, actorExternalId?: string): Promise<void>;
}
