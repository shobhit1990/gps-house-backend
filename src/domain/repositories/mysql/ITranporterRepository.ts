import { EntityManager } from "@mikro-orm/mysql";
import { Transporter } from "../../entities/mysql/Transporter";
import { User } from "../../entities/mysql/User";

export interface ITransporterRepository {
  createTransporter(
    transporter: Transporter,
    unifiedUser?: User,
  ): Promise<Transporter>;

  getTransporter(): Promise<Transporter[]>;

  getTransporterById(externalId: string): Promise<Transporter | null>;

  updateTransporter(transporter: Transporter): Promise<Transporter>;

  deleteTransporter(externalId: string, em: EntityManager): Promise<void>;
}
