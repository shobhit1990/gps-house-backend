import { Client } from "../../entities/mysql/Client";
import { User } from "../../entities/mysql/User";

export interface IClientRepository {
  getClientByUsername(username: string): Promise<Client | null>;

  createClient(client: Client, unifiedUser?: User): Promise<Client>;

  getClient(): Promise<Client[]>;

  getClientById(externalId: string): Promise<Client | null>;

  updateClient(client: Client): Promise<Client>;

  deleteClient(externalId: string): Promise<void>;
}
