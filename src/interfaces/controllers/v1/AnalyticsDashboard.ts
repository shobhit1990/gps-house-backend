import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { ITravelSummaryService } from "../../../services/interfaces/ITravelSummaryService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { AppError } from "../../../utils/errors";
import { parseTravelDateTime } from "../../../utils/travelSummary";

@injectable()
export class AnalyticsDashboardController {
  constructor(
    @inject("ITravelSummaryService")
    private readonly travelSummaryService: ITravelSummaryService,
  ) {}

  
  getAnalyticsDashboard = asyncHandler(async (req: Request, res: Response) => {
    const fromRaw = readQuery(req, "from") ?? readQuery(req, "startDate");
    const toRaw = readQuery(req, "to") ?? readQuery(req, "endDate");
    if (!fromRaw || !toRaw) {
      throw new AppError("from and to datetimes are required", 400);
    }

    const from = parseTravelDateTime(fromRaw, "from");
    const to = parseTravelDateTime(toRaw, "to");
    const data = await this.travelSummaryService.getTravelSummary({
      clientId: readQuery(req, "client") ?? readQuery(req, "clientId"),
      transporterId: readQuery(req, "transporter") ?? readQuery(req, "transporterId"),
      vehicleId: readQuery(req, "vehicle") ?? readQuery(req, "vehicleId"),
      search: readQuery(req, "search"),
      from,
      to,
    });

    res.status(200).json({
      message: "Analytics Dashboard report fetched successfully",
      filter: {
        client: readQuery(req, "client") ?? readQuery(req, "clientId") ?? null,
        transporter:
          readQuery(req, "transporter") ?? readQuery(req, "transporterId") ?? null,
        vehicle: readQuery(req, "vehicle") ?? readQuery(req, "vehicleId") ?? null,
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
