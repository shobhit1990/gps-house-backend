import { CertificateAdd } from "../../entities/mysql/CertificateAdd";
import { Client } from "../../entities/mysql/Client";

export interface ICertificateAddRepository {
  getCertificateAdds(): Promise<CertificateAdd[]>;

  getCertificateAddById(externalId: string): Promise<CertificateAdd | null>;

  createCertificateAdd(certificateAdd: CertificateAdd): Promise<CertificateAdd>;

  updateCertificateAdd(certificateAdd: CertificateAdd): Promise<CertificateAdd>;

  deleteCertificateAdd(externalId: string, deletedBy?: Client): Promise<void>;
}
