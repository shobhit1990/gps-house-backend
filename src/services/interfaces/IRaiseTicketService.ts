import {
  CreateRaiseTicketDto,
  UpdateRaiseTicketDto,
} from "../../domain/dto/RaiseTicketDto";
import { Status } from "../../domain/enums/status";
import { TicketType } from "../../domain/enums/TicketType";

export interface RaiseTicketResponse {
  id: string;
  client: { id: string; name: string } | null;
  transporter: { id: string; companyName: string } | null;
  vehicle: { id: string; vehicle: string } | null;
  ticketType: TicketType;
  description: string;
  status: Status | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRaiseTicketService {
  getRaiseTickets(): Promise<RaiseTicketResponse[]>;
  getRaiseTicketById(externalId: string): Promise<RaiseTicketResponse>;
  createRaiseTicket(
    payload: CreateRaiseTicketDto,
    actorUserId?: number,
  ): Promise<RaiseTicketResponse>;
  updateRaiseTicket(
    externalId: string,
    payload: UpdateRaiseTicketDto,
    actorUserId?: number,
  ): Promise<RaiseTicketResponse>;
  deleteRaiseTicket(externalId: string, actorUserId?: number): Promise<void>;
}
