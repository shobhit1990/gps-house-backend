import { User } from "../../entities/mysql/User";

export interface IUserRepository {
  getUsers(): Promise<User[]>;

  getUserById(externalId: string): Promise<User | null>;

  getUserByUsername(
    userName: string,
    excludeExternalId?: string,
  ): Promise<User | null>;

  getUserByEmail(
    email: string,
    excludeExternalId?: string,
  ): Promise<User | null>;

  getUserByPhone(
    phone: string,
    excludeExternalId?: string,
  ): Promise<User | null>;

  createUser(user: User): Promise<User>;

  updateUser(user: User): Promise<User>;

  deleteUser(externalId: string, deletedBy?: number): Promise<void>;
}
