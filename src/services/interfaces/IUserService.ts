import { AddUserDto, UpdateUserDto } from "../../domain/dto/AddUserDto";
import { LoginUserDto, RegisterUserDto } from "../../domain/dto/UserAuthDto";
import { User } from "../../domain/entities/mysql/User";
import { MenuType } from "../../domain/enums/MenuType";
import { MenuSidebarResponse } from "../../domain/models/MenuSidebarResponse";

export interface UserLoginResult {
  user: User;
  token: string;
  refreshToken: string;
  menus: MenuSidebarResponse;
}

export interface UserLoginOptions {
  allowedMenuTypes?: MenuType[];
}

export interface IUserService {
  getUsers(): Promise<User[]>;

  getUserById(externalId: string): Promise<User>;

  addUser(payload: AddUserDto, actorUserId?: number): Promise<User>;

  registerUser(payload: RegisterUserDto): Promise<User>;

  loginUser(
    payload: LoginUserDto,
    options?: UserLoginOptions,
  ): Promise<UserLoginResult>;

  refreshAuthToken(
    refreshToken: string,
    options?: UserLoginOptions,
  ): Promise<UserLoginResult>;

  logout(refreshToken: string): Promise<void>;

  updateUser(
    externalId: string,
    payload: UpdateUserDto,
    actorUserId?: number,
  ): Promise<User>;

  deleteUser(externalId: string, actorUserId?: number): Promise<void>;
}
