import { Jobsheet } from "../../entities/mysql/Jobsheet";
import { Client } from "../../entities/mysql/Client";

export interface IJobsheetRepository {
  getJobsheets(): Promise<Jobsheet[]>;
  getJobsheetById(externalId: string): Promise<Jobsheet | null>;
  isPhoneInUse(phone: string, excludeExternalId?: string): Promise<boolean>;
  createJobsheet(jobsheet: Jobsheet): Promise<Jobsheet>;
  updateJobsheet(jobsheet: Jobsheet): Promise<Jobsheet>;
  deleteJobsheet(externalId: string, deletedBy?: Client): Promise<void>;
}
