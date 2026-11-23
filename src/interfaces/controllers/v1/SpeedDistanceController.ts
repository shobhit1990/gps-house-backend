import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { ISpeedDistanceService } from "../../../services/interfaces/ISpeedDistanceService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { AppError } from "../../../utils/errors";
import { parseTravelDateTime } from "../../../utils/travelSummary";

@injectable()
export class SpeedDistanceController {
  constructor(
    @inject("ISpeedDistanceService")
    private readonly speedDistanceService: ISpeedDistanceService,
  ) {}

  /**
   * GET /speed-and-distance-report
   * ?client=&transporter=&vehicle=&from=&to=&search=
   */
  getSpeedDistanceReport = asyncHandler(async (req: Request, res: Response) => {
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

    const data = await this.speedDistanceService.getSpeedDistanceReport({
      clientId,
      transporterId,
      vehicleId,
      search,
      from,
      to,
    });

    res.status(200).json({
      message: "Speed vs Distance report fetched successfully",
      filter: {
        client: clientId ?? null,
        transporter: transporterId ?? null,
        vehicle: vehicleId ?? null,
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
