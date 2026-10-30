import {
  CreateParkedScheduleDto,
  UpdateParkedScheduleDto,
} from "../../domain/dto/ParkedScheduleDto";
import { Scheduled } from "../../domain/enums/Scheduled";
import { Status } from "../../domain/enums/status";

export interface ParkedScheduleResponse {
  id: string;
  client: { id: string; name: string };
  transporter: { id: string; companyName: string };
  vehicle: { id: string; vehicle: string };
  scheduled: Scheduled;
  startDate: string | null;
  endDate: string | null;
  scheduledFrom: string;
  scheduledTill: string;
  status: Status | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IParkedScheduleService {
  getParkedSchedules(): Promise<ParkedScheduleResponse[]>;
  getParkedScheduleById(externalId: string): Promise<ParkedScheduleResponse>;
  createParkedSchedule(
    payload: CreateParkedScheduleDto,
    actorUserId?: number,
  ): Promise<ParkedScheduleResponse>;
  updateParkedSchedule(
    externalId: string,
    payload: UpdateParkedScheduleDto,
    actorUserId?: number,
  ): Promise<ParkedScheduleResponse>;
  deleteParkedSchedule(externalId: string, actorUserId?: number): Promise<void>;
}
