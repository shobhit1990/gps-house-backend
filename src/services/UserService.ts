import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import { AddUserDto, UpdateUserDto } from "../domain/dto/AddUserDto";
import { LoginUserDto, RegisterUserDto } from "../domain/dto/UserAuthDto";
import { AddGroup } from "../domain/entities/mysql/AddGroup";
import { Client } from "../domain/entities/mysql/Client";
import { Language } from "../domain/entities/mysql/Language";
import { Owner } from "../domain/entities/mysql/Owner";
import { TimeZone } from "../domain/entities/mysql/TimeZone";
import { User } from "../domain/entities/mysql/User";
import { InactiveTime } from "../domain/enums/InactiveTime";
import { Status } from "../domain/enums/status";
import { UserType } from "../domain/enums/UserType";
import { IUserRepository } from "../domain/repositories/mysql/IUserRepository";
import { AppError } from "../utils/errors";
import {
  createAuthToken,
  createRefreshToken,
  hashRefreshToken,
} from "../utils/authToken";
import {
  hashPassword,
  isBcryptPasswordHash,
  verifyPassword,
} from "../utils/passwordHash";
import { IUserService, UserLoginResult } from "./interfaces/IUserService";

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
    user.password = await hashPassword(payload.password);
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
    user.userType = payload.userType ?? UserType.USER;
    user.imeiNumber = payload.imeiNumber;
    user.reason = payload.reason;
    user.createdBy = actor;

    return this.userRepository.createUser(user);
  }

  async registerUser(payload: RegisterUserDto): Promise<User> {
    const phone = payload.contactNumber ?? payload.phone;
    if (
      payload.contactNumber &&
      payload.phone &&
      payload.contactNumber !== payload.phone
    ) {
      throw this.duplicateFieldError(
        "contactNumber",
        "contactNumber and phone must match when both are provided",
      );
    }

    if (!payload.email && !phone) {
      throw this.duplicateFieldError(
        "contactNumber",
        "Email or contactNumber is required",
      );
    }

    if (payload.email) {
      const duplicateEmail = await this.userRepository.getUserByEmail(
        payload.email,
      );
      if (duplicateEmail) {
        throw this.duplicateFieldError("email", "Email already exists");
      }
    }

    if (phone) {
      const duplicatePhone = await this.userRepository.getUserByPhone(phone);
      if (duplicatePhone) {
        throw this.duplicateFieldError(
          "contactNumber",
          "Contact number already exists",
        );
      }
    }

    const em = this.em.fork();
    const owner = payload.owner_name
      ? await this.findActiveOwner(em, payload.owner_name)
      : undefined;
    const language = payload.language
      ? await this.findActiveLanguage(em, payload.language)
      : undefined;
    const timezone = payload.timezone
      ? await this.findActiveTimezone(em, payload.timezone)
      : undefined;
    const client = payload.client
      ? await this.findActiveClientUser(em, payload.client)
      : undefined;

    this.validateProfileRelations(payload);

    const user = new User();
    user.userName = payload.userName ?? user.externalId;
    if (payload.userName) {
      const duplicateUsername = await this.userRepository.getUserByUsername(
        payload.userName,
      );
      if (duplicateUsername) {
        throw this.duplicateFieldError("userName", "Username already exists");
      }
    }
    user.name = payload.name;
    user.contactPersonName = payload.contactPersonName ?? payload.name;
    user.companyName = payload.companyName ?? payload.name;
    user.password = await hashPassword(payload.password);
    user.email = payload.email;
    user.phone = phone;
    user.address = payload.address;
    user.companyAddress = payload.companyAddress ?? payload.address;
    user.userType = payload.userType;
    user.imeiNumber = payload.imeiNumber;
    user.status = Status.ACTIVE;
    user.owner = owner;
    user.language = language;
    user.timezone = timezone;
    user.client = client;
    user.domain = payload.domain;
    user.vehicleCount = payload.vehicleCount;
    user.maxVehicleCount = payload.maxVehicleCount;
    user.allowAllVehicleList = payload.allowAllVehicleList;
    user.clientImage = payload.clientImage;
    user.inactiveTime =
      payload.userType === UserType.TRANSPORTER
        ? (payload.inactiveTime ?? InactiveTime.ONE)
        : payload.inactiveTime;
    user.subscriptionStartDate = payload.subscriptionStartDate
      ? new Date(payload.subscriptionStartDate)
      : undefined;
    user.subscriptionDueDate = payload.subscriptionDueDate
      ? new Date(payload.subscriptionDueDate)
      : undefined;
    user.subscriptionExtendDate = payload.subscriptionExtendDate
      ? new Date(payload.subscriptionExtendDate)
      : undefined;
    user.subscriptionExpiryCount = payload.subscriptionExpiryCount;
    user.maximumRadiusForNearestPOI =
      payload.maximumRadiusForNearestPOI ?? payload.maxRadiusNearestPoi;
    user.minimumDistanceForAddress =
      payload.minimumDistanceForAddress ?? payload.minDistanceForAddress;
    user.dataRestriction = payload.dataRestriction;
    user.overwriteSubscription = payload.overwriteSubscription;
    user.vehicleInactiveAfterExpiry = payload.vehicleInactiveAfterExpiry;

    return this.userRepository.createUser(user);
  }

  private validateProfileRelations(payload: RegisterUserDto): void {
    const requiredFields: Partial<Record<UserType, string[]>> = {
      [UserType.CLIENT]: ["owner_name", "language", "timezone"],
      [UserType.TRANSPORTER]: [
        "client",
        "language",
        "timezone",
        "subscriptionStartDate",
        "subscriptionDueDate",
        "subscriptionExtendDate",
      ],
      [UserType.TECHNICIAN]: ["client", "timezone"],
    };

    const missing = (requiredFields[payload.userType] ?? []).filter(
      (field) => !payload[field as keyof RegisterUserDto],
    );
    if (missing.length > 0) {
      throw this.duplicateFieldError(
        missing[0],
        `Required for ${payload.userType}: ${missing.join(", ")}`,
      );
    }
  }

  private async findActiveOwner(
    em: EntityManager,
    externalId: string,
  ): Promise<Owner> {
    const owner = await em.findOne(Owner, {
      externalId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!owner) throw new AppError("Invalid or inactive Owner ID", 400);
    return owner;
  }

  private async findActiveLanguage(
    em: EntityManager,
    externalId: string,
  ): Promise<Language> {
    const language = await em.findOne(Language, {
      externalId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!language) throw new AppError("Invalid or inactive Language ID", 400);
    return language;
  }

  private async findActiveTimezone(
    em: EntityManager,
    externalId: string,
  ): Promise<TimeZone> {
    const timezone = await em.findOne(TimeZone, {
      externalId,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!timezone) throw new AppError("Invalid or inactive TimeZone ID", 400);
    return timezone;
  }

  private async findActiveClientUser(
    em: EntityManager,
    externalId: string,
  ): Promise<User> {
    const client = await em.findOne(User, {
      externalId,
      userType: UserType.CLIENT,
      isDeleted: false,
      status: Status.ACTIVE,
    });
    if (!client) throw new AppError("Invalid or inactive Client user ID", 400);
    return client;
  }

  async loginUser(payload: LoginUserDto): Promise<UserLoginResult> {
    const identifiers = [
      payload.userName,
      payload.email,
      payload.contactNumber,
    ].filter(Boolean);
    if (identifiers.length !== 1) {
      throw this.duplicateFieldError(
        "userName",
        "Provide exactly one of userName, email, or contactNumber",
      );
    }

    const user = await this.userRepository.getUserForLogin(
      payload.userName,
      payload.email,
      payload.contactNumber,
    );
    if (!user || user.isDeleted || user.status !== Status.ACTIVE) {
      throw new AppError("Invalid credentials", 401);
    }

    const validPassword = await verifyPassword(payload.password, user.password);
    if (!validPassword) throw new AppError("Invalid credentials", 401);

    if (!isBcryptPasswordHash(user.password)) {
      user.password = await hashPassword(payload.password);
      await this.userRepository.updatePasswordHash(
        user.externalId,
        user.password,
      );
    }

    return this.issueTokens(user);
  }

  async refreshAuthToken(refreshToken: string): Promise<UserLoginResult> {
    const user = await this.userRepository.getUserForRefreshToken(
      hashRefreshToken(refreshToken),
    );
    if (!user || user.status !== Status.ACTIVE) {
      throw new AppError("Invalid or expired refresh token", 401);
    }

    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    const user = await this.userRepository.getUserForRefreshToken(
      hashRefreshToken(refreshToken),
    );
    if (user) {
      await this.userRepository.updateRefreshToken(user.externalId, null, null);
    }
  }

  private async issueTokens(user: User): Promise<UserLoginResult> {
    const token = createAuthToken(user);
    const refresh = createRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await this.userRepository.updateRefreshToken(
      user.externalId,
      refresh.hash,
      expiresAt,
    );

    return {
      user,
      token,
      refreshToken: refresh.token,
    };
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
      user.password = await hashPassword(payload.password);
      user.sessionVersion += 1;
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
    if (payload.userType !== undefined) user.userType = payload.userType;
    if (payload.imeiNumber !== undefined) {
      user.imeiNumber = payload.imeiNumber;
    }
    if (payload.reason !== undefined) user.reason = payload.reason;

    return this.userRepository.updateUser(user, payload.password !== undefined);
  }

  async deleteUser(externalId: string, actorUserId?: number): Promise<void> {
    const user = await this.getUserById(externalId);
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
