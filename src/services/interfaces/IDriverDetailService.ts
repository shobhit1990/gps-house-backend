import {
  CreateDriverDetailDto,
  UpdateDriverDetailDto,
} from "../../domain/dto/DriverDetailDto";
import { Status } from "../../domain/enums/status";

export interface DriverDetailResponse {
  id: string;
  client: { id: string; name: string | null; companyName: string };
  transporter: { id: string; name: string | null; companyName: string } | null;
  firstName: string;
  lastName: string;
  deviceId: string | null;
  dateOfJoining: string | null;
  dateOfLeaving: string | null;
  dateOfBirth: string | null;
  experience: number | null;
  salary: number | null;
  phoneNumber: string | null;
  licenseNumber: string | null;
  licenseToDrive: { id: string; license: string }[];
  licenseIssueDate: string | null;
  licenseExpiryDate: string | null;
  lifeInsuranceNumber: string | null;
  lifeInsuranceExpiryDate: string | null;
  mediclaimNumber: string | null;
  mediclaimExpiryDate: string | null;
  bloodGroup: string | null;
  supervisorName: string | null;
  supervisorPhoneNumber: string | null;
  address: string | null;
  documents: Array<{ documentName: string; uploadDocument: string }>;
  licenseAvailable: boolean;
  licenseVerified: boolean;
  enableGeoVerifiedAttendance: boolean;
  geofences: { id: string; name: string }[];
  status: Status | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DriverDetailBulkUploadError {
  row: number;
  column: string;
  message: string;
}

export interface DriverDetailBulkUploadResult {
  httpStatus: number;
  success: boolean;
  message: string;
  totalRecords: number;
  insertedRecords: number;
  duplicateRecords: number;
  failedRecords: number;
  errors: DriverDetailBulkUploadError[];
}

export interface IDriverDetailService {
  getDriverDetails(): Promise<DriverDetailResponse[]>;

  getDriverDetailExport(): Promise<Buffer>;

  bulkUploadDriverDetails(
    fileName: string,
    fileBuffer: Buffer,
    clientExternalId: string,
    transporterExternalId: string,
    actorExternalId?: string,
  ): Promise<DriverDetailBulkUploadResult>;

  getDriverDetailById(externalId: string): Promise<DriverDetailResponse>;

  createDriverDetail(
    payload: CreateDriverDetailDto,
    actorExternalId?: string,
  ): Promise<DriverDetailResponse>;

  updateDriverDetail(
    externalId: string,
    payload: UpdateDriverDetailDto,
    actorExternalId?: string,
  ): Promise<DriverDetailResponse>;

  deleteDriverDetail(
    externalId: string,
    actorExternalId?: string,
  ): Promise<void>;
}
