import { Technician } from "../../entities/mysql/Technician";
import { User } from "../../entities/mysql/User";
import { Client } from "../../entities/mysql/Client";

export interface ITechnicianRepository {
  getTechnicians(): Promise<Technician[]>;

  getTechnicianById(externalId: string): Promise<Technician | null>;

  createTechnician(
    technician: Technician,
    unifiedUser?: User,
  ): Promise<Technician>;

  updateTechnician(technician: Technician): Promise<Technician>;

  deleteTechnician(externalId: string, deletedBy?: Client): Promise<void>;
}
