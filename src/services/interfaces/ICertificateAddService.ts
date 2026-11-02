import {
  CreateCertificateAddDto,
  UpdateCertificateAddDto,
} from "../../domain/dto/CertificateAddDto";
import { Status } from "../../domain/enums/status";

interface CertificateRelationResponse {
  id: string;
  name: string | null;
}

interface VehicleResponse {
  id: string;
  vehicle: string;
}

interface StateResponse {
  id: string;
  stateCode: string;
  stateName: string;
}

interface DistrictResponse {
  id: string;
  districtCode: string;
  districtName: string;
}

export interface CertificateAddResponse {
  id: string;
  vehicleNumber: VehicleResponse;
  numberOfSos: number | null;
  deviceInstallationDate: Date | null;
  chassisNumber: string | null;
  manufacturingCompany: string | null;
  vehicleManufacturingDate: Date | null;
  registrationDate: Date | null;
  engineNumber: string | null;
  lastFitnessDate: Date | null;
  vehicleModel: string | null;
  customerName: string | null;
  customerAddress: string | null;
  dealerName: string | null;
  dealerAddress: string | null;
  vtdModel: string | null;
  vtdUniqueId: string | null;
  invoiceNumber: string | null;
  invoiceDate: Date | null;
  simIccidNumber: string | null;
  ideaNumber: string | null;
  bsnlNumber: string | null;
  rtoState: StateResponse | null;
  rtoDistrict: DistrictResponse | null;
  dueDate: Date | null;
  fitmentImage1: string | null;
  fitmentImage2: string | null;
  fitmentImage3: string | null;
  fitmentImage4: string | null;
  vendorLogo1: string | null;
  vendorLogo2: string | null;
  name: string | null;
  surname: string | null;
  fatherName: string | null;
  panNumber: string | null;
  aadhaarNo: string | null;
  remark: string | null;
  pancardLogo: string | null;
  aadhaarFront: string | null;
  aadhaarBack: string | null;
  status: Status | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICertificateAddService {
  getCertificateAdds(): Promise<CertificateAddResponse[]>;

  getCertificateAddById(externalId: string): Promise<CertificateAddResponse>;

  createCertificateAdd(
    payload: CreateCertificateAddDto,
    actorUserId?: number,
  ): Promise<CertificateAddResponse>;

  updateCertificateAdd(
    externalId: string,
    payload: UpdateCertificateAddDto,
    actorUserId?: number,
  ): Promise<CertificateAddResponse>;

  deleteCertificateAdd(externalId: string, actorUserId?: number): Promise<void>;
}
