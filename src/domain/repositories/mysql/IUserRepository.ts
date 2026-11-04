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

  getUserForLogin(
    userName?: string,
    email?: string,
    phone?: string,
  ): Promise<User | null>;

  getUserForRefreshToken(tokenHash: string): Promise<User | null>;

  updatePasswordHash(externalId: string, passwordHash: string): Promise<void>;

  updateRefreshToken(
    externalId: string,
    tokenHash: string | null,
    expiresAt: Date | null,
  ): Promise<void>;

  createUser(user: User): Promise<User>;

  updateUser(user: User, revokeRefreshToken?: boolean): Promise<User>;

  deleteUser(externalId: string, deletedBy?: number): Promise<void>;
}
