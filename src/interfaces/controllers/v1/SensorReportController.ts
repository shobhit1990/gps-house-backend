import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { SensorReportType } from "../../../domain/enums/SensorReportType";
import { ISensorReportService } from "../../../services/interfaces/ISensorReportService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { AppError } from "../../../utils/errors";
import { parseTravelDateTime } from "../../../utils/travelSummary";

@injectable()
export class SensorReportController {
  constructor(
    @inject("ISensorReportService")
    private readonly sensorReportService: ISensorReportService,
  ) {}

  /**
   * GET /sensor-report
   * ?client=&transporter=&vehicle=&reportType=&from=&to=&search=
   * reportType uses SensorReportType enum (comma-separated allowed).
   */
  getSensorReport = asyncHandler(async (req: Request, res: Response) => {
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
    const reportTypes = parseReportTypes(
      readQuery(req, "reportType") ??
        readQuery(req, "reportTypes") ??
        readQuery(req, "type"),
    );

    const data = await this.sensorReportService.getSensorReport({
      clientId,
      transporterId,
      vehicleId,
      search,
      reportTypes,
      from,
      to,
    });

    res.status(200).json({
      message: "Sensor Report fetched successfully",
      filter: {
        client: clientId ?? null,
        transporter: transporterId ?? null,
        vehicle: vehicleId ?? null,
        reportType: reportTypes ?? Object.values(SensorReportType),
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

function parseReportTypes(
  raw: string | undefined,
): SensorReportType[] | undefined {
  if (!raw) {
    return undefined;
  }
  const values = Object.values(SensorReportType) as string[];
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return undefined;
  }

  const normalized: SensorReportType[] = [];
  for (const part of parts) {
    const match = values.find(
      (value) => value.toLowerCase() === part.toLowerCase(),
    );
    if (!match) {
      throw new AppError(
        `Invalid reportType. Use SensorReportType enum values: ${values.join(", ")}`,
        400,
      );
    }
    normalized.push(match as SensorReportType);
  }
  return [...new Set(normalized)];
}
