import { container } from "tsyringe";
import { IRoleRepository } from "../../../domain/repositories/mysql/IRoleRepository";
import { IRoleService } from "../../../services/interfaces/IRoleService";
import { RoleService } from "../../../services/RoleService";
import { RoleRepository } from "../../persistence/repositories/mysql/RoleRepository";

export function registerRoleDependencies() {
  container.register<IRoleRepository>("IRoleRepository", RoleRepository);
  container.register<IRoleService>("IRoleService", RoleService);
}
