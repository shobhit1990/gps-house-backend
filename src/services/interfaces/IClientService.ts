import { CreateClientDto, UpdateClientDto } from "../../domain/dto/ClientDto";
import { Client } from "../../domain/entities/mysql/Client";

export interface IClientService {

    getClient(): Promise<Client[]>;

    getClientById(externalId: string): Promise<Client | null>;

    createClient(
    payload: CreateClientDto,
    actorUserId: number
  ): Promise<Client>;
  
  updateClient(
        externalId: string,
        payload: UpdateClientDto,
    ): Promise<Client>;

    deleteClient(
        externalId: string,
    ): Promise<void>;
}