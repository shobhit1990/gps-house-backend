import { RaiseTicket } from "../../entities/mysql/RaiseTicket";
import { Client } from "../../entities/mysql/Client";

export interface IRaiseTicketRepository {
  getRaiseTickets(): Promise<RaiseTicket[]>;
  getRaiseTicketById(externalId: string): Promise<RaiseTicket | null>;
  createRaiseTicket(ticket: RaiseTicket): Promise<RaiseTicket>;
  updateRaiseTicket(ticket: RaiseTicket): Promise<RaiseTicket>;
  deleteRaiseTicket(externalId: string, deletedBy?: Client): Promise<void>;
}
