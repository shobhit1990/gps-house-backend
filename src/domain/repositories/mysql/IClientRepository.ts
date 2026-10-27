import { Client } from "../../entities/mysql/Client";

export interface IClientRepository {

    getClientByUsername(username: string): Promise<Client | null>;

    createClient(client: Client): Promise<Client>;

    getClient(): Promise<Client[]>;

    getClientById(externalId: string): Promise<Client | null>;

    updateClient(client: Client): Promise<Client>;

    deleteClient(externalId: string): Promise<void>;
}