import {
  CreateJobsheetDto,
  UpdateJobsheetDto,
} from "../../domain/dto/JobsheetDto";

export interface JobsheetResponse {
  id: string;
  vehicle: {
    id: string;
    vehicle: string;
    vehicleNickname: string | null;
  } | null;
  technician: {
    id: string;
    name: string | null;
    companyName: string;
    phone: string | null;
  };
  contactPersonName: string;
  phone: string;
  orderNo: string | null;
  instruction: string | null;
  status: string | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJobsheetService {
  getJobsheets(): Promise<JobsheetResponse[]>;
  getJobsheetById(externalId: string): Promise<JobsheetResponse>;
  createJobsheet(
    payload: CreateJobsheetDto,
    actorUserId?: number,
  ): Promise<JobsheetResponse>;
  updateJobsheet(
    externalId: string,
    payload: UpdateJobsheetDto,
    actorUserId?: number,
  ): Promise<JobsheetResponse>;
  deleteJobsheet(externalId: string, actorUserId?: number): Promise<void>;
}
