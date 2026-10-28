import {
  CreateTechnicianDto,
  UpdateTechnicianDto,
} from "../../domain/dto/TechnicianDto";

export interface TechnicianResponse {
  id: string;
  userName: string;
  companyName: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  timezone: {
    id: string;
    timeZone: string;
  };
  client: {
    id: string;
    name: string | null;
    companyName: string;
  };
  status: string | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITechnicianService {
  getTechnicians(): Promise<TechnicianResponse[]>;

  getTechnicianById(externalId: string): Promise<TechnicianResponse>;

  createTechnician(
    payload: CreateTechnicianDto,
    actorUserId?: number,
  ): Promise<TechnicianResponse>;

  updateTechnician(
    externalId: string,
    payload: UpdateTechnicianDto,
    actorUserId?: number,
  ): Promise<TechnicianResponse>;

  deleteTechnician(externalId: string, actorUserId?: number): Promise<void>;
}
