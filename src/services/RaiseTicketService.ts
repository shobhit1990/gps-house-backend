import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import {
  CreateRaiseTicketDto,
  UpdateRaiseTicketDto,
} from "../domain/dto/RaiseTicketDto";
import { AddVehicle } from "../domain/entities/mysql/AddVehicle";
import { Client } from "../domain/entities/mysql/Client";
import { RaiseTicket } from "../domain/entities/mysql/RaiseTicket";
import { Transporter } from "../domain/entities/mysql/Transporter";
import { Status } from "../domain/enums/status";
import { IRaiseTicketRepository } from "../domain/repositories/mysql/IRaiseTicketRepository";
import { AppError } from "../utils/errors";
import {
  IRaiseTicketService,
  RaiseTicketResponse,
} from "./interfaces/IRaiseTicketService";

@injectable()
export class RaiseTicketService implements IRaiseTicketService {
  constructor(
    @inject("IRaiseTicketRepository")
    private readonly repository: IRaiseTicketRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getRaiseTickets(): Promise<RaiseTicketResponse[]> {
    const tickets = await this.repository.getRaiseTickets();
    return tickets.map((ticket) => this.toResponse(ticket));
  }

  async getRaiseTicketById(externalId: string): Promise<RaiseTicketResponse> {
    const ticket = await this.repository.getRaiseTicketById(externalId);
    if (!ticket) throw new AppError("Raise ticket not found", 404);
    return this.toResponse(ticket);
  }

  async createRaiseTicket(
    payload: CreateRaiseTicketDto,
    actorUserId?: number,
  ): Promise<RaiseTicketResponse> {
    const associations = await this.resolveAssociations(
      payload.client,
      payload.transporter,
      payload.vehicle,
    );
    const actor = await this.findActor(actorUserId);

    const ticket = new RaiseTicket();
    ticket.client = associations.client;
    ticket.transporter = associations.transporter;
    ticket.vehicle = associations.vehicle;
    ticket.ticketType = payload.ticketType;
    ticket.description = payload.description;
    ticket.status = payload.status ?? Status.ACTIVE;
    ticket.reason = payload.reason ?? null;
    ticket.createdBy = actor;

    return this.toResponse(await this.repository.createRaiseTicket(ticket));
  }

  async updateRaiseTicket(
    externalId: string,
    payload: UpdateRaiseTicketDto,
    actorUserId?: number,
  ): Promise<RaiseTicketResponse> {
    if (Object.keys(payload).length === 0) {
      throw new AppError(
        "At least one field is required to update a raise ticket",
        400,
      );
    }
    const ticket = await this.repository.getRaiseTicketById(externalId);
    if (!ticket) throw new AppError("Raise ticket not found", 404);

    const associations = await this.resolveAssociations(
      payload.client !== undefined ? payload.client : ticket.client?.externalId,
      payload.transporter !== undefined
        ? payload.transporter
        : ticket.transporter?.externalId,
      payload.vehicle !== undefined
        ? payload.vehicle
        : ticket.vehicle?.externalId,
    );
    ticket.client = associations.client;
    ticket.transporter = associations.transporter;
    ticket.vehicle = associations.vehicle;
    if (payload.ticketType !== undefined)
      ticket.ticketType = payload.ticketType;
    if (payload.description !== undefined) {
      ticket.description = payload.description;
    }
    if (payload.status !== undefined) ticket.status = payload.status;
    if (payload.reason !== undefined) ticket.reason = payload.reason;

    const actor = await this.findActor(actorUserId);
    if (actor) ticket.updatedBy = actor;
    return this.toResponse(await this.repository.updateRaiseTicket(ticket));
  }

  async deleteRaiseTicket(
    externalId: string,
    actorUserId?: number,
  ): Promise<void> {
    const actor = await this.findActor(actorUserId);
    await this.repository.deleteRaiseTicket(externalId, actor);
  }

  private async resolveAssociations(
    clientId?: string | null,
    transporterId?: string | null,
    vehicleId?: string | null,
  ): Promise<{
    client: Client | null;
    transporter: Transporter | null;
    vehicle: AddVehicle | null;
  }> {
    const em = this.em.fork();
    const [client, transporter, vehicle] = await Promise.all([
      clientId
        ? em.findOne(Client, { externalId: clientId, isDeleted: false })
        : null,
      transporterId
        ? em.findOne(Transporter, {
            externalId: transporterId,
            isDeleted: false,
          })
        : null,
      vehicleId
        ? em.findOne(AddVehicle, { externalId: vehicleId, isDeleted: false })
        : null,
    ]);

    if (clientId && !client) throw new AppError("Client not found", 404);
    if (transporterId && !transporter) {
      throw new AppError("Transporter not found", 404);
    }
    if (vehicleId && !vehicle) throw new AppError("Vehicle not found", 404);
    if (client && client.status !== Status.ACTIVE) {
      throw new AppError("Client is inactive", 400);
    }
    if (transporter && transporter.status !== Status.ACTIVE) {
      throw new AppError("Transporter is inactive", 400);
    }
    if (
      vehicle &&
      vehicle.status !== undefined &&
      vehicle.status !== Status.ACTIVE
    ) {
      throw new AppError("Vehicle is inactive", 400);
    }
    return { client, transporter, vehicle };
  }

  private async findActor(userId?: number): Promise<Client | undefined> {
    if (userId === undefined) return undefined;
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new AppError("Invalid user ID", 401);
    }
    const actor = await this.em.fork().findOne(Client, {
      id: userId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!actor) throw new AppError("User not found", 401);
    return actor;
  }

  private toResponse(ticket: RaiseTicket): RaiseTicketResponse {
    return {
      id: ticket.externalId,
      client: ticket.client
        ? { id: ticket.client.externalId, name: ticket.client.name ?? "" }
        : null,
      transporter: ticket.transporter
        ? {
            id: ticket.transporter.externalId,
            companyName: ticket.transporter.companyName,
          }
        : null,
      vehicle: ticket.vehicle
        ? { id: ticket.vehicle.externalId, vehicle: ticket.vehicle.vehicle }
        : null,
      ticketType: ticket.ticketType,
      description: ticket.description,
      status: ticket.status ?? null,
      reason: ticket.reason ?? null,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }
}
