import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { RaiseTicket } from "../../../../domain/entities/mysql/RaiseTicket";
import { AddVehicle } from "../../../../domain/entities/mysql/AddVehicle";
import { Client } from "../../../../domain/entities/mysql/Client";
import { Transporter } from "../../../../domain/entities/mysql/Transporter";
import { IRaiseTicketRepository } from "../../../../domain/repositories/mysql/IRaiseTicketRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class RaiseTicketRepository implements IRaiseTicketRepository {
  constructor(private readonly em: EntityManager) {}

  async getRaiseTickets(): Promise<RaiseTicket[]> {
    return this.em.fork().find(
      RaiseTicket,
      { isDeleted: false },
      {
        populate: ["client", "transporter", "vehicle"],
        orderBy: { createdAt: "DESC" },
      },
    );
  }

  async getRaiseTicketById(externalId: string): Promise<RaiseTicket | null> {
    return this.em
      .fork()
      .findOne(
        RaiseTicket,
        { externalId, isDeleted: false },
        { populate: ["client", "transporter", "vehicle"] },
      );
  }

  async createRaiseTicket(ticket: RaiseTicket): Promise<RaiseTicket> {
    const em = this.em.fork();
    this.assignRelations(em, ticket);
    if (ticket.createdBy) {
      ticket.createdBy = em.getReference(Client, ticket.createdBy.id);
    }
    await em.persistAndFlush(ticket);
    await em.populate(ticket, ["client", "transporter", "vehicle"]);
    return ticket;
  }

  async updateRaiseTicket(ticket: RaiseTicket): Promise<RaiseTicket> {
    const em = this.em.fork();
    const existing = await em.findOne(
      RaiseTicket,
      { externalId: ticket.externalId, isDeleted: false },
      { populate: ["client", "transporter", "vehicle"] },
    );
    if (!existing) throw new AppError("Raise ticket not found", 404);

    em.assign(existing, {
      client: ticket.client ? em.getReference(Client, ticket.client.id) : null,
      transporter: ticket.transporter
        ? em.getReference(Transporter, ticket.transporter.id)
        : null,
      vehicle: ticket.vehicle
        ? em.getReference(AddVehicle, ticket.vehicle.id)
        : null,
      ticketType: ticket.ticketType,
      description: ticket.description,
      status: ticket.status ?? null,
      reason: ticket.reason ?? null,
      ...(ticket.updatedBy
        ? { updatedBy: em.getReference(Client, ticket.updatedBy.id) }
        : {}),
      updatedAt: new Date(),
    });
    await em.flush();
    await em.populate(existing, ["client", "transporter", "vehicle"]);
    return existing;
  }

  async deleteRaiseTicket(
    externalId: string,
    deletedBy?: Client,
  ): Promise<void> {
    const em = this.em.fork();
    const ticket = await em.findOne(RaiseTicket, {
      externalId,
      isDeleted: false,
    });
    if (!ticket) throw new AppError("Raise ticket not found", 404);

    const now = new Date();
    ticket.isDeleted = true;
    ticket.deletedAt = now;
    ticket.updatedAt = now;
    if (deletedBy) {
      ticket.deletedBy = em.getReference(Client, deletedBy.id);
    }
    await em.flush();
  }

  private assignRelations(em: EntityManager, ticket: RaiseTicket): void {
    if (ticket.client) {
      ticket.client = em.getReference(Client, ticket.client.id);
    }
    if (ticket.transporter) {
      ticket.transporter = em.getReference(Transporter, ticket.transporter.id);
    }
    if (ticket.vehicle) {
      ticket.vehicle = em.getReference(AddVehicle, ticket.vehicle.id);
    }
  }
}
