import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import { AddUserDto, UpdateUserDto } from "../domain/dto/AddUserDto";
import { AddGroup } from "../domain/entities/mysql/AddGroup";
import { Client } from "../domain/entities/mysql/Client";
import { TimeZone } from "../domain/entities/mysql/TimeZone";
import { User } from "../domain/entities/mysql/User";
import { Status } from "../domain/enums/status";
import { IUserRepository } from "../domain/repositories/mysql/IUserRepository";
import { AppError } from "../utils/errors";
import { IUserService } from "./interfaces/IUserService";

@injectable()
export class UserService implements IUserService {
  constructor(
    @inject("IUserRepository")
    private readonly userRepository: IUserRepository,
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getUsers(): Promise<User[]> {
    return this.userRepository.getUsers();
  }

  async getUserById(externalId: string): Promise<User> {
    const user = await this.userRepository.getUserById(externalId);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return user;
  }

  async addUser(payload: AddUserDto, actorUserId?: number): Promise<User> {
    if (payload.password !== payload.confirmPassword) {
      throw new AppError("Password and Confirm Password do not match", 400);
    }

    const duplicateUsername = await this.userRepository.getUserByUsername(
      payload.userName,
    );
    if (duplicateUsername) {
      throw this.duplicateFieldError("userName", "Username already exists");
    }

    if (payload.email) {
      const duplicateEmail = await this.userRepository.getUserByEmail(
        payload.email,
      );
      if (duplicateEmail) {
        throw this.duplicateFieldError("email", "Email already exists");
      }
    }

    if (payload.phone) {
      const duplicatePhone = await this.userRepository.getUserByPhone(
        payload.phone,
      );
      if (duplicatePhone) {
        throw this.duplicateFieldError("phone", "Phone already exists");
      }
    }

    const em = this.em.fork();
    const group = await em.findOne(AddGroup, {
      externalId: payload.group,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!group) {
      throw new AppError("Invalid or inactive Group ID", 400);
    }

    const timezone = await em.findOne(TimeZone, {
      externalId: payload.timezone,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!timezone) {
      throw new AppError("Invalid or inactive TimeZone ID", 400);
    }

    let actor: Client | undefined;
    if (actorUserId !== undefined) {
      if (!Number.isSafeInteger(actorUserId) || actorUserId <= 0) {
        throw new AppError("Invalid user ID", 401);
      }
      const foundActor = await em.findOne(Client, {
        id: actorUserId,
        isDeleted: false,
        status: Status.ACTIVE,
      });
      if (!foundActor) {
        throw new AppError("User not found", 401);
      }
      actor = foundActor;
    }

    const user = new User();
    user.userName = payload.userName;
    user.password = payload.password;
    user.group = group;
    user.timezone = timezone;
    user.companyName = payload.companyName;
    user.contactPersonName = payload.contactPersonName;
    user.email = payload.email;
    user.phone = payload.phone;
    user.companyAddress = payload.companyAddress;
    user.dataRestrictionDays = payload.dataRestrictionDays;
    user.isSchoolUser = payload.isSchoolUser ?? false;
    user.status = payload.status ?? Status.ACTIVE;
    user.reason = payload.reason;
    user.createdBy = actor;

    return this.userRepository.createUser(user);
  }

  async updateUser(
    externalId: string,
    payload: UpdateUserDto,
    actorUserId?: number,
  ): Promise<User> {
    const user = await this.getUserById(externalId);
    const hasUpdates = Object.keys(payload).some(
      (key) => key !== "confirmPassword",
    );
    if (!hasUpdates) {
      throw new AppError("At least one user field is required", 400);
    }

    if (payload.password !== undefined) {
      if (payload.confirmPassword === undefined) {
        throw new AppError(
          "confirmPassword is required when changing password",
          400,
        );
      }
      if (payload.password !== payload.confirmPassword) {
        throw new AppError("Password and Confirm Password do not match", 400);
      }
      user.password = payload.password;
    } else if (payload.confirmPassword !== undefined) {
      throw new AppError(
        "password is required when changing confirmPassword",
        400,
      );
    }

    if (payload.userName !== undefined && payload.userName !== user.userName) {
      const duplicateUsername = await this.userRepository.getUserByUsername(
        payload.userName,
        externalId,
      );
      if (duplicateUsername) {
        throw this.duplicateFieldError("userName", "Username already exists");
      }
      user.userName = payload.userName;
    }

    if (payload.email !== undefined && payload.email !== user.email) {
      const duplicateEmail = await this.userRepository.getUserByEmail(
        payload.email,
        externalId,
      );
      if (duplicateEmail) {
        throw this.duplicateFieldError("email", "Email already exists");
      }
      user.email = payload.email;
    }

    if (payload.phone !== undefined && payload.phone !== user.phone) {
      const duplicatePhone = await this.userRepository.getUserByPhone(
        payload.phone,
        externalId,
      );
      if (duplicatePhone) {
        throw this.duplicateFieldError("phone", "Phone already exists");
      }
      user.phone = payload.phone;
    }

    const em = this.em.fork();
    if (payload.group !== undefined) {
      const group = await em.findOne(AddGroup, {
        externalId: payload.group,
        isDeleted: false,
        status: Status.ACTIVE,
      });
      if (!group) {
        throw new AppError("Invalid or inactive Group ID", 400);
      }
      user.group = group;
    }

    if (payload.timezone !== undefined) {
      const timezone = await em.findOne(TimeZone, {
        externalId: payload.timezone,
        isDeleted: false,
        status: Status.ACTIVE,
      });
      if (!timezone) {
        throw new AppError("Invalid or inactive TimeZone ID", 400);
      }
      user.timezone = timezone;
    }

    const actor = await this.findActor(actorUserId);
    if (actor) user.updatedBy = actor;

    if (payload.companyName !== undefined) {
      user.companyName = payload.companyName;
    }
    if (payload.contactPersonName !== undefined) {
      user.contactPersonName = payload.contactPersonName;
    }
    if (payload.companyAddress !== undefined) {
      user.companyAddress = payload.companyAddress;
    }
    if (payload.dataRestrictionDays !== undefined) {
      user.dataRestrictionDays = payload.dataRestrictionDays;
    }
    if (payload.isSchoolUser !== undefined) {
      user.isSchoolUser = payload.isSchoolUser;
    }
    if (payload.status !== undefined) user.status = payload.status;
    if (payload.reason !== undefined) user.reason = payload.reason;

    return this.userRepository.updateUser(user);
  }

  async deleteUser(externalId: string, actorUserId?: number): Promise<void> {
    await this.getUserById(externalId);
    const actor = await this.findActor(actorUserId);
    await this.userRepository.deleteUser(externalId, actor?.id);
  }

  private async findActor(userId?: number): Promise<Client | undefined> {
    if (userId === undefined) return undefined;
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new AppError("Invalid user ID", 401);
    }

    const actor = await this.em.fork().findOne(Client, {
      id: userId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!actor) {
      throw new AppError("User not found", 401);
    }
    return actor;
  }

  private duplicateFieldError(field: string, message: string): AppError {
    const fieldError = { field, message };
    return new AppError(
      "Validation failed. Please check the errors and try again.",
      400,
      null,
      [fieldError],
    );
  }
}
