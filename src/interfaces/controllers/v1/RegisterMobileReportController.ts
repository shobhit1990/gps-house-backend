import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { MobileReportType } from "../../../domain/enums/MobileReportType";
import { IRegisterMobileReportService } from "../../../services/interfaces/IRegisterMobileReportService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { AppError } from "../../../utils/errors";

@injectable()
export class RegisterMobileReportController {
  constructor(
    @inject("IRegisterMobileReportService")
    private readonly registerMobileReportService: IRegisterMobileReportService,
  ) {}

  /**
   * Flow:
   * 1) client (required)
   * 2) type = user | transporter (MobileReportType)
   * 3) if type=transporter → optional transporter filter
   *
   * GET /register-mobile-report?client=&type=user
   * GET /register-mobile-report?client=&type=transporter&transporter=
   */
  getRegisterMobileReport = asyncHandler(
    async (req: Request, res: Response) => {
      const clientId = readQuery(req, "client") ?? readQuery(req, "clientId");
      if (!clientId) {
        throw new AppError("client is required", 400);
      }

      const type = parseType(
        readQuery(req, "type") ?? readQuery(req, "jtype"),
      );

      const transporterId =
        readQuery(req, "transporter") ?? readQuery(req, "transporterId");
      if (type === MobileReportType.USER && transporterId) {
        throw new AppError(
          "transporter filter is only allowed when type=transporter",
          400,
        );
      }

      const search = readQuery(req, "search");

      const data =
        await this.registerMobileReportService.getRegisterMobileReport({
          clientId,
          type,
          transporterId:
            type === MobileReportType.TRANSPORTER
              ? transporterId
              : undefined,
          search,
        });

      res.status(200).json({
        message: "Register Mobile Report fetched successfully",
        filter: {
          client: clientId,
          type,
          transporter:
            type === MobileReportType.TRANSPORTER
              ? (transporterId ?? null)
              : null,
          search: search ?? null,
        },
        data,
      });
    },
  );
}

function readQuery(req: Request, key: string): string | undefined {
  const value = req.query[key];
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function parseType(raw: string | undefined): MobileReportType {
  if (!raw) {
    throw new AppError(
      `type is required. Use MobileReportType: ${Object.values(MobileReportType).join(", ")}`,
      400,
    );
  }
  const values = Object.values(MobileReportType) as string[];
  const match = values.find(
    (value) => value.toLowerCase() === raw.trim().toLowerCase(),
  );
  if (!match) {
    throw new AppError(
      `Invalid type. Use MobileReportType: ${values.join(", ")}`,
      400,
    );
  }
  return match as MobileReportType;
}
