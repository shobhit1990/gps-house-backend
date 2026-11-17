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
  dateOfJoining: Date | null;
  dateOfLeaving: Date | null;
  dateOfBirth: Date | null;
  experience: number | null;
  salary: number | null;
  phoneNumber: string | null;
  licenseNumber: string | null;
  licenseToDrive: { id: string; license: string }[];
  licenseIssueDate: Date | null;
  licenseExpiryDate: Date | null;
  lifeInsuranceNumber: string | null;
  lifeInsuranceExpiryDate: Date | null;
  mediclaimNumber: string | null;
  mediclaimExpiryDate: Date | null;
  bloodGroup: string | null;
  supervisorName: string | null;
  supervisorPhoneNumber: string | null;
  address: string | null;
  licenseAvailable: boolean;
  licenseVerified: boolean;
  enableGeoVerifiedAttendance: boolean;
  geofences: { id: string; name: string }[];
  status: Status | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDriverDetailService {
  getDriverDetails(): Promise<DriverDetailResponse[]>;

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
