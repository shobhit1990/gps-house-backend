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
    actorUserId?: number,
  ): Promise<LicenseResponse>;

  updateLicense(
    externalId: string,
    payload: UpdateLicenseDto,
    actorUserId?: number,
  ): Promise<LicenseResponse>;

  deleteLicense(externalId: string, actorUserId?: number): Promise<void>;
}
