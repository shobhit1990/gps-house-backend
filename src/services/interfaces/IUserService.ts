import { AddUserDto, UpdateUserDto } from "../../domain/dto/AddUserDto";
import { User } from "../../domain/entities/mysql/User";

export interface IUserService {
  getUsers(): Promise<User[]>;

  getUserById(externalId: string): Promise<User>;

  addUser(payload: AddUserDto, actorUserId?: number): Promise<User>;

  updateUser(
    externalId: string,
    payload: UpdateUserDto,
    actorUserId?: number,
  ): Promise<User>;

  deleteUser(externalId: string, actorUserId?: number): Promise<void>;
}
