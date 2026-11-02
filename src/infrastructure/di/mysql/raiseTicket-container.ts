import { container } from "tsyringe";
import { IRaiseTicketRepository } from "../../../domain/repositories/mysql/IRaiseTicketRepository";
import { RaiseTicketRepository } from "../../persistence/repositories/mysql/RaiseTicketRepository";
import { IRaiseTicketService } from "../../../services/interfaces/IRaiseTicketService";
import { RaiseTicketService } from "../../../services/RaiseTicketService";

export function registerRaiseTicketDependencies() {
  container.register<IRaiseTicketRepository>(
    "IRaiseTicketRepository",
    RaiseTicketRepository,
  );
  container.register<IRaiseTicketService>(
    "IRaiseTicketService",
    RaiseTicketService,
  );
}
