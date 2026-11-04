import { AddUserDto, UpdateUserDto } from "../../domain/dto/AddUserDto";
import { LoginUserDto, RegisterUserDto } from "../../domain/dto/UserAuthDto";
import { User } from "../../domain/entities/mysql/User";

export interface UserLoginResult {
  user: User;
  token: string;
  refreshToken: string;
}

export interface IUserService {
  getUsers(): Promise<User[]>;

  getUserById(externalId: string): Promise<User>;

  addUser(payload: AddUserDto, actorUserId?: number): Promise<User>;

  registerUser(payload: RegisterUserDto): Promise<User>;

  loginUser(payload: LoginUserDto): Promise<UserLoginResult>;

  refreshAuthToken(refreshToken: string): Promise<UserLoginResult>;

  logout(refreshToken: string): Promise<void>;

  updateUser(
    externalId: string,
    payload: UpdateUserDto,
    actorUserId?: number,
  ): Promise<User>;

  deleteUser(externalId: string, actorUserId?: number): Promise<void>;
}
