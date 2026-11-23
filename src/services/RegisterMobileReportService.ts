import { FilterQuery } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/mysql";
import { inject, injectable } from "tsyringe";
import { Client } from "../domain/entities/mysql/Client";
import { Transporter } from "../domain/entities/mysql/Transporter";
import { User } from "../domain/entities/mysql/User";
import { MobileReportType } from "../domain/enums/MobileReportType";
import { UserType } from "../domain/enums/UserType";
import { AppError } from "../utils/errors";
import {
  IRegisterMobileReportService,
  RegisterMobileReportQuery,
  RegisterMobileReportRow,
  RegisterMobileTransporterRow,
  RegisterMobileUserRow,
} from "./interfaces/IRegisterMobileReportService";

@injectable()
export class RegisterMobileReportService
  implements IRegisterMobileReportService
{
  constructor(
    @inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async getRegisterMobileReport(
    query: RegisterMobileReportQuery,
  ): Promise<RegisterMobileReportRow[]> {
    await this.assertClientExists(query.clientId);

    if (query.type === MobileReportType.USER) {
      return this.getUserRows(query);
    }
    if (query.type === MobileReportType.TRANSPORTER) {
      return this.getTransporterRows(query);
    }
    throw new AppError(
      `Invalid type. Use MobileReportType: ${Object.values(MobileReportType).join(", ")}`,
      400,
    );
  }

  private async assertClientExists(clientId: string): Promise<void> {
    const client = await this.em.fork().findOne(Client, {
      externalId: clientId,
      isDeleted: false,
    });
    if (!client) {
      throw new AppError("Client not found", 404);
    }
  }

  /** type=user → user columns for selected client. */
  private async getUserRows(
    query: RegisterMobileReportQuery,
  ): Promise<RegisterMobileUserRow[]> {
    const where: FilterQuery<User> = {
      isDeleted: false,
      userType: { roleCode: UserType.USER },
      group: {
        transporter: {
          client: { externalId: query.clientId, isDeleted: false },
          isDeleted: false,
        },
      },
    };

    if (query.search?.trim()) {
      const like = `%${query.search.trim().replace(/[%_]/g, "")}%`;
      where.$or = [
        { userName: { $like: like } },
        { name: { $like: like } },
        { companyName: { $like: like } },
        { email: { $like: like } },
        { phone: { $like: like } },
      ];
    }

    const users = await this.em.fork().find(User, where, {
      populate: ["group", "timezone", "userType"],
      orderBy: { userName: "ASC" },
    });

    return users.map((user, index) => {
      const imei = user.imeiNumber?.trim() || null;
      return {
        sn: index + 1,
        type: MobileReportType.USER,
        id: user.externalId,
        username: user.userName,
        activeCount: imei ? 1 : 0,
        status: user.status ?? null,
        name: user.name ?? user.contactPersonName ?? null,
        companyName: user.companyName ?? null,
        email: user.email ?? null,
        phone: user.phone ?? null,
        imeiNumber: imei,
        group: user.group
          ? { id: user.group.externalId, groupName: user.group.groupName }
          : null,
        timezone: user.timezone
          ? {
              id: user.timezone.externalId,
              timeZone: user.timezone.timeZone,
            }
          : null,
        userType: user.userType
          ? {
              id: user.userType.externalId,
              roleCode: user.userType.roleCode,
              name: user.userType.name ?? null,
            }
          : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    });
  }

  /** type=transporter → transporter columns for selected client (+ optional transporter). */
  private async getTransporterRows(
    query: RegisterMobileReportQuery,
  ): Promise<RegisterMobileTransporterRow[]> {
    const where: FilterQuery<Transporter> = {
      isDeleted: false,
      client: { externalId: query.clientId, isDeleted: false },
    };

    if (query.transporterId) {
      where.externalId = query.transporterId;
    }

    if (query.search?.trim()) {
      const like = `%${query.search.trim().replace(/[%_]/g, "")}%`;
      where.$or = [
        { userName: { $like: like } },
        { name: { $like: like } },
        { companyName: { $like: like } },
        { email: { $like: like } },
      ];
    }

    const transporters = await this.em.fork().find(Transporter, where, {
      populate: ["client", "language", "timezone"],
      orderBy: { userName: "ASC" },
    });

    const userNames = transporters.map((t) => t.userName);
    const linkedUsers =
      userNames.length === 0
        ? []
        : await this.em.fork().find(
            User,
            { userName: { $in: userNames }, isDeleted: false },
            { fields: ["userName", "imeiNumber"] },
          );
    const imeiByUserName = new Map(
      linkedUsers.map((user) => [
        user.userName,
        user.imeiNumber?.trim() || null,
      ]),
    );

    return transporters.map((transporter, index) => {
      const imei = imeiByUserName.get(transporter.userName) ?? null;
      return {
        sn: index + 1,
        type: MobileReportType.TRANSPORTER,
        id: transporter.externalId,
        username: transporter.userName,
        activeCount: imei ? 1 : 0,
        status: transporter.status ?? null,
        name: transporter.name ?? null,
        companyName: transporter.companyName ?? null,
        email: transporter.email ?? null,
        phone: transporter.phone?.toString() ?? null,
        imeiNumber: imei,
        address: transporter.address ?? null,
        language: transporter.language
          ? {
              id: transporter.language.externalId,
              languageName: transporter.language.languageName,
            }
          : null,
        timezone: transporter.timezone
          ? {
              id: transporter.timezone.externalId,
              timeZone: transporter.timezone.timeZone,
            }
          : null,
        subscriptionStartDate: transporter.subscriptionStartDate ?? null,
        subscriptionDueDate: transporter.subscriptionDueDate ?? null,
        subscriptionExtendDate: transporter.subscriptionExtendDate ?? null,
        createdAt: transporter.createdAt,
        updatedAt: transporter.updatedAt,
      };
    });
  }
}
