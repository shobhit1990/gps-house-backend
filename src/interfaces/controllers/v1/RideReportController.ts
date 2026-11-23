import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { DurationMinutes } from "../../../domain/enums/DurationMinutes";
import { IRideReportService } from "../../../services/interfaces/IRideReportService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { AppError } from "../../../utils/errors";
import { parseTravelDateTime } from "../../../utils/travelSummary";

@injectable()
export class RideReportController {
  constructor(
    @inject("IRideReportService")
    private readonly rideReportService: IRideReportService,
  ) {}

  /**
   * GET /ride-report
   * ?client=&transporter=&vehicle=&duration=&from=&to=&search=
   * duration uses DurationMinutes enum: 5 | 10 | 30 | 60 | 120
   */
  getRideReport = asyncHandler(async (req: Request, res: Response) => {
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
    const durationMinutes = parseDurationMinutes(
      readQuery(req, "duration") ?? readQuery(req, "durationMinutes"),
    );

    const data = await this.rideReportService.getRideReport({
      clientId,
      transporterId,
      vehicleId,
      search,
      durationMinutes,
      from,
      to,
    });

    res.status(200).json({
      message: "Ride Report fetched successfully",
      filter: {
        client: clientId ?? null,
        transporter: transporterId ?? null,
        vehicle: vehicleId ?? null,
        duration: durationMinutes,
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
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function parseDurationMinutes(raw: string | undefined): DurationMinutes {
  if (!raw) {
    throw new AppError(
      `duration is required. Use DurationMinutes enum: ${Object.values(DurationMinutes).join(", ")}`,
      400,
    );
  }

  const allowed = Object.values(DurationMinutes).filter(
    (value) => typeof value === "number",
  ) as number[];
  const minutes = Number(raw);
  if (!Number.isFinite(minutes) || !allowed.includes(minutes)) {
    throw new AppError(
      `Invalid duration. Use DurationMinutes enum: ${allowed.join(", ")}`,
      400,
    );
  }
  return minutes as DurationMinutes;
}
