import { Client } from "../../entities/mysql/Client";
import { License } from "../../entities/mysql/License";

export interface ILicenseRepository {
  getLicenses(): Promise<License[]>;

  getLicenseById(externalId: string): Promise<License | null>;

  createLicense(license: License): Promise<License>;

  updateLicense(license: License): Promise<License>;

  deleteLicense(externalId: string, deletedBy?: Client): Promise<void>;
}
