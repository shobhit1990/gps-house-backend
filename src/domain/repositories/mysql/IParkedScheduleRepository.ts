import { ParkedSchedule } from "../../entities/mysql/ParkedSchedule";
import { Client } from "../../entities/mysql/Client";

export interface IParkedScheduleRepository {
  getParkedSchedules(): Promise<ParkedSchedule[]>;
  getParkedScheduleById(externalId: string): Promise<ParkedSchedule | null>;
  createParkedSchedule(schedule: ParkedSchedule): Promise<ParkedSchedule>;
  updateParkedSchedule(schedule: ParkedSchedule): Promise<ParkedSchedule>;
  deleteParkedSchedule(externalId: string, deletedBy?: Client): Promise<void>;
}
