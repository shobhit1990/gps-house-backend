import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { IdleSummaryStatus } from "../../../domain/enums/IdleSummaryStatus";
import { Minutes } from "../../../domain/enums/Minutes";
import { IIdleSummaryService } from "../../../services/interfaces/IIdleSummaryService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { AppError } from "../../../utils/errors";
import { parseTravelDateTime } from "../../../utils/travelSummary";

@injectable()
export class IdleSummaryController {
  constructor(
    @inject("IIdleSummaryService")
    private readonly idleSummaryService: IIdleSummaryService,
  ) {}

  /** GET /idle-summary-report — Idle Summary Report filters (does not change liveTracking). */
  getIdleSummary = asyncHandler(async (req: Request, res: Response) => {
    const fromRaw = readQuery(req, "from") ?? readQuery(req, "startDate");
    const toRaw = readQuery(req, "to") ?? readQuery(req, "endDate");
    if (!fromRaw || !toRaw) {
      throw new AppError("from and to datetimes are required", 400);
    }

    const from = parseTravelDateTime(fromRaw, "from");
    const to = parseTravelDateTime(toRaw, "to");
    const durationMinutes = parseDurationMinutes(
      readQuery(req, "duration") ?? readQuery(req, "durationMinutes"),
    );
    // status comes only from IdleSummaryStatus enum: "Ignition Off" | "Idle"
    const statuses = parseStatuses(
      readQuery(req, "status") ?? readQuery(req, "statuses"),
    );

    const clientId = readQuery(req, "client") ?? readQuery(req, "clientId");
    const transporterId =
      readQuery(req, "transporter") ?? readQuery(req, "transporterId");
    const vehicleId = readQuery(req, "vehicle") ?? readQuery(req, "vehicleId");
    const search = readQuery(req, "search");

    const data = await this.idleSummaryService.getIdleSummary({
      clientId,
      transporterId,
      vehicleId,
      search,
      durationMinutes,
      statuses,
      from,
      to,
    });

    res.status(200).json({
      message: "Idle Summary Report fetched successfully",
      filter: {
        client: clientId ?? null,
        transporter: transporterId ?? null,
        vehicle: vehicleId ?? null,
        duration: durationMinutes,
        status: statuses ?? Object.values(IdleSummaryStatus),
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

function parseDurationMinutes(raw: string | undefined): number {
  if (!raw) {
    throw new AppError("duration (minutes) is required", 400);
  }
  const minuteValues = Object.values(Minutes) as string[];
  if (!minuteValues.includes(raw) && !/^\d+(\.\d+)?$/.test(raw)) {
    throw new AppError(
      `Invalid duration. Use Minutes enum (1-60) or a non-negative minute count`,
      400,
    );
  }
  const minutes = Number(raw);
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new AppError("duration must be a non-negative number of minutes", 400);
  }
  return minutes;
}

function parseStatuses(raw: string | undefined): IdleSummaryStatus[] | undefined {
  if (!raw) {
    return undefined;
  }
  const values = Object.values(IdleSummaryStatus) as string[];
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return undefined;
  }
  const invalid = parts.filter((part) => !values.includes(part));
  if (invalid.length > 0) {
    throw new AppError(
      `Invalid status. Use IdleSummaryStatus enum values: ${values.join(", ")}`,
      400,
    );
  }
  return [...new Set(parts)] as IdleSummaryStatus[];
}
