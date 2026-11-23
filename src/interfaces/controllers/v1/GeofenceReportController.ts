import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { Duration } from "../../../domain/enums/Duration";
import { IGeofenceReportService } from "../../../services/interfaces/IGeofenceReportService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { AppError } from "../../../utils/errors";
import { parseTravelDateTime } from "../../../utils/travelSummary";

@injectable()
export class GeofenceReportController {
  constructor(
    @inject("IGeofenceReportService")
    private readonly geofenceReportService: IGeofenceReportService,
  ) {}

  /**
   * GET /geofence-report
   * ?client=&transporter=&vehicle=&duration=&from=&to=&search=
   * duration uses Duration enum:
   * All | Less than 5 minutes | Greater than 5 minutes and less than 10 minutes |
   * Greater than 10 minutes and less than 30 minutes | More than 1 hour
   */
  getGeofenceReport = asyncHandler(async (req: Request, res: Response) => {
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
    const duration = parseDuration(
      readQuery(req, "duration") ?? readQuery(req, "durationType"),
    );

    const data = await this.geofenceReportService.getGeofenceReport({
      clientId,
      transporterId,
      vehicleId,
      search,
      duration,
      from,
      to,
    });

    res.status(200).json({
      message: "Geofence Report fetched successfully",
      filter: {
        client: clientId ?? null,
        transporter: transporterId ?? null,
        vehicle: vehicleId ?? null,
        duration,
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

function parseDuration(raw: string | undefined): Duration {
  const values = Object.values(Duration) as string[];
  if (!raw) {
    throw new AppError(
      `duration is required. Use Duration enum: ${values.join(", ")}`,
      400,
    );
  }

  const match = values.find(
    (value) => value.toLowerCase() === raw.trim().toLowerCase(),
  );
  if (match) {
    return match as Duration;
  }

  const keyMatch = Object.entries(Duration).find(
    ([key]) => key.toLowerCase() === raw.trim().toLowerCase(),
  );
  if (keyMatch) {
    return keyMatch[1] as Duration;
  }

  throw new AppError(
    `Invalid duration. Use Duration enum: ${values.join(", ")}`,
    400,
  );
}
