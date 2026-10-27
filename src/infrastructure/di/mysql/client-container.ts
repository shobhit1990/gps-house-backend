import { container } from "tsyringe";
import { IClientRepository } from "../../../domain/repositories/mysql/IClientRepository";
import { ClientRepository } from "../../persistence/repositories/mysql/ClientRepository";
import { IClientService } from "../../../services/interfaces/IClientService";
import { ClientService } from "../../../services/ClientService";

export function registerClientDependencies() {
  container.register<IClientRepository>("IClientRepository", {
    useClass: ClientRepository,
  });
  container.register<IClientService>("IClientService", {
    useClass: ClientService,
  });
}