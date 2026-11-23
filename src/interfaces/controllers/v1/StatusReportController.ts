import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { VehicleStatus } from "../../../domain/enums/VehicleStatus";
import { IStatusReportService } from "../../../services/interfaces/IStatusReportService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { AppError } from "../../../utils/errors";
import { parseTravelDateTime } from "../../../utils/travelSummary";

@injectable()
export class StatusReportController {
  constructor(
    @inject("IStatusReportService")
    private readonly statusReportService: IStatusReportService,
  ) {}

  /**
   * GET /status-report
   * ?client=&transporter=&vehicle=&status=&from=&to=&search=
   * status uses VehicleStatus enum (comma-separated allowed).
   */
  getStatusReport = asyncHandler(async (req: Request, res: Response) => {
    const fromRaw = readQuery(req, "from") ?? readQuery(req, "startDate");
    const toRaw = readQuery(req, "to") ?? readQuery(req, "endDate");
    if (!fromRaw || !toRaw) {
      throw new AppError("from and to datetimes are required", 400);
    }

    const from = parseTravelDateTime(fromRaw, "from");
    const to = parseTravelDateTime(toRaw, "to");
    const clientId = readQuery(req, "client") ?? readQuery(req, "clientId");
    const transporterId =
      readQuery(req, "transporter") ?? readQuery(req, "transporterId");
    const vehicleId = readQuery(req, "vehicle") ?? readQuery(req, "vehicleId");
    const search = readQuery(req, "search");
    const statuses = parseStatuses(
      readQuery(req, "status") ?? readQuery(req, "statuses"),
    );

    const data = await this.statusReportService.getStatusReport({
      clientId,
      transporterId,
      vehicleId,
      search,
      statuses,
      from,
      to,
    });

    res.status(200).json({
      message: "Status Report fetched successfully",
      filter: {
        client: clientId ?? null,
        transporter: transporterId ?? null,
        vehicle: vehicleId ?? null,
        status: statuses ?? Object.values(VehicleStatus),
        search: search ?? null,
        from: from.toISOString(),
        to: to.toISOString(),
      },
      data,
    });
  });
}

function readQuery(req: Request, key: string): string | undefined {
  const value = req.query[key];
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    return parts.length ? parts.join(",") : undefined;
  }
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseStatuses(raw: string | undefined): VehicleStatus[] | undefined {
  if (!raw) {
    return undefined;
  }
  const values = Object.values(VehicleStatus) as string[];
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return undefined;
  }

  const normalized: VehicleStatus[] = [];
  for (const part of parts) {
    const match = values.find(
      (value) => value.toLowerCase() === part.toLowerCase(),
    );
    if (!match) {
      throw new AppError(
        `Invalid status. Use VehicleStatus enum values: ${values.join(", ")}`,
        400,
      );
    }
    normalized.push(match as VehicleStatus);
  }
  return [...new Set(normalized)];
}
