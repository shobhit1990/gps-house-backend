import { EntityManager } from "@mikro-orm/mysql";
import { injectable } from "tsyringe";
import { FormError } from "../../../../domain/dto/FormError";
import { AddGroup } from "../../../../domain/entities/mysql/AddGroup";
import { Client } from "../../../../domain/entities/mysql/Client";
import { TimeZone } from "../../../../domain/entities/mysql/TimeZone";
import { User } from "../../../../domain/entities/mysql/User";
import { IUserRepository } from "../../../../domain/repositories/mysql/IUserRepository";
import { AppError } from "../../../../utils/errors";

@injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly em: EntityManager) {}

  async getUsers(): Promise<User[]> {
    return this.em.fork().find(
      User,
      { isDeleted: false },
      {
        populate: ["group", "timezone"],
      },
    );
  }

  async getUserById(externalId: string): Promise<User | null> {
    return this.em
      .fork()
      .findOne(
        User,
        { externalId, isDeleted: false },
        { populate: ["group", "timezone"] },
      );
  }

  async getUserByUsername(
    userName: string,
    excludeExternalId?: string,
  ): Promise<User | null> {
    return this.findByUniqueField("userName", userName, excludeExternalId);
  }

  async getUserByEmail(
    email: string,
    excludeExternalId?: string,
  ): Promise<User | null> {
    return this.findByUniqueField("email", email, excludeExternalId);
  }

  async getUserByPhone(
    phone: string,
    excludeExternalId?: string,
  ): Promise<User | null> {
    return this.findByUniqueField("phone", phone, excludeExternalId);
  }

  async createUser(user: User): Promise<User> {
    const em = this.em.fork();
    user.group = em.getReference(AddGroup, user.group.id);
    user.timezone = em.getReference(TimeZone, user.timezone.id);
    if (user.createdBy) {
      user.createdBy = em.getReference(Client, user.createdBy.id);
    }
    em.persist(user);

    try {
      await em.flush();
    } catch (error: unknown) {
      this.throwDuplicateError(error);
    }

    await em.populate(user, ["group", "timezone"]);
    return user;
  }

  async updateUser(user: User): Promise<User> {
    const em = this.em.fork();
    const existing = await em.findOne(
      User,
      { externalId: user.externalId, isDeleted: false },
      { populate: ["group", "timezone"] },
    );

    if (!existing) {
      throw new AppError("User not found", 404);
    }

    em.assign(existing, {
      userName: user.userName,
      password: user.password,
      group: em.getReference(AddGroup, user.group.id),
      timezone: em.getReference(TimeZone, user.timezone.id),
      companyName: user.companyName,
      contactPersonName: user.contactPersonName,
      email: user.email,
      phone: user.phone,
      companyAddress: user.companyAddress,
      dataRestrictionDays: user.dataRestrictionDays,
      isSchoolUser: user.isSchoolUser,
      status: user.status,
      reason: user.reason,
      ...(user.updatedBy
        ? { updatedBy: em.getReference(Client, user.updatedBy.id) }
        : {}),
      updatedAt: new Date(),
    });

    try {
      await em.flush();
    } catch (error: unknown) {
      this.throwDuplicateError(error);
    }

    await em.populate(existing, ["group", "timezone"]);
    return existing;
  }

  async deleteUser(externalId: string, deletedBy?: number): Promise<void> {
    const em = this.em.fork();
    const user = await em.findOne(User, { externalId, isDeleted: false });
    if (!user) {
      throw new AppError("User not found", 404);
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.updatedAt = new Date();
    if (deletedBy !== undefined) {
      user.deletedBy = em.getReference(Client, deletedBy);
    }
    await em.flush();
  }

  private async findByUniqueField(
    field: "userName" | "email" | "phone",
    value: string,
    excludeExternalId?: string,
  ): Promise<User | null> {
    const criteria = {
      [field]: value,
      isDeleted: false,
      ...(excludeExternalId ? { externalId: { $ne: excludeExternalId } } : {}),
    };
    return this.em.fork().findOne(User, criteria);
  }

  private throwDuplicateError(error: unknown): never {
    const current = error as {
      code?: string;
      errno?: number;
      message?: string;
      sqlMessage?: string;
    };
    const text = [current.sqlMessage, current.message]
      .filter(Boolean)
      .join(" ");

    if (
      current.code === "ER_DUP_ENTRY" ||
      current.errno === 1062 ||
      /duplicate entry/i.test(text)
    ) {
      const fieldError = new FormError();
      if (/user_name_unique|userName/i.test(text)) {
        fieldError.field = "userName";
        fieldError.message = "Username already exists";
      } else if (/email_unique|email/i.test(text)) {
        fieldError.field = "email";
        fieldError.message = "Email already exists";
      } else if (/phone_unique|phone/i.test(text)) {
        fieldError.field = "phone";
        fieldError.message = "Phone already exists";
      } else {
        fieldError.field = "general";
        fieldError.message = "Duplicate value already exists";
      }

      throw new AppError(
        "Validation failed. Please check the errors and try again.",
        400,
        null,
        [fieldError],
      );
    }

    throw error;
  }
}
