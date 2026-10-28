import { container } from "tsyringe";
import { IUserRepository } from "../../../domain/repositories/mysql/IUserRepository";
import { IUserService } from "../../../services/interfaces/IUserService";
import { UserService } from "../../../services/UserService";
import { UserRepository } from "../../persistence/repositories/mysql/UserRepository";

export function registerUserDependencies() {
  container.register<IUserRepository>("IUserRepository", {
    useClass: UserRepository,
  });
  container.register<IUserService>("IUserService", {
    useClass: UserService,
  });
}
