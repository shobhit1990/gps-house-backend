import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { ReportType } from "../../../domain/enums/ReportType";
import { SortOrder } from "../../../domain/enums/SortType";
import { ITravelSummaryService } from "../../../services/interfaces/ITravelSummaryService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { AppError } from "../../../utils/errors";
import { parseTravelDateTime } from "../../../utils/travelSummary";

@injectable()
export class DistanceReportController {
  constructor(
    @inject("ITravelSummaryService")
    private readonly travelSummaryService: ITravelSummaryService,
  ) {}

  getDistanceReport = asyncHandler(async (req: Request, res: Response) => {
    const fromRaw = readQuery(req, "from") ?? readQuery(req, "startDate");
    const toRaw = readQuery(req, "to") ?? readQuery(req, "endDate");
    if (!fromRaw || !toRaw) {
      throw new AppError("from and to datetimes are required", 400);
    }

    const from = parseTravelDateTime(fromRaw, "from");
    const to = parseTravelDateTime(toRaw, "to");
    const reportType = parseReportType(
      readQuery(req, "reportType") ?? readQuery(req, "report"),
    );
    const sortOrder = parseSortOrder(
      readQuery(req, "sortOrder") ?? readQuery(req, "sortType") ?? readQuery(req, "sort"),
    );

    const clientId = readQuery(req, "client") ?? readQuery(req, "clientId");
    const transporterId =
      readQuery(req, "transporter") ?? readQuery(req, "transporterId");
    const vehicleId = readQuery(req, "vehicle") ?? readQuery(req, "vehicleId");

    const data = await this.travelSummaryService.getTravelSummary({
      clientId,
      transporterId,
      vehicleId,
      search: readQuery(req, "search"),
      from,
      to,
      reportType,
      sortOrder,
    });

    res.status(200).json({
      message: "Distance Report fetched successfully",
      filter: {
        client: clientId ?? null,
        transporter: transporterId ?? null,
        vehicle: vehicleId ?? null,
        from: from.toISOString(),
        to: to.toISOString(),
        reportType,
        sortOrder: sortOrder ?? null,
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

function parseReportType(raw: string | undefined): ReportType {
  if (!raw) {
    return ReportType.VEHICLE_WISE;
  }
  const values = Object.values(ReportType) as string[];
  if (!values.includes(raw)) {
    throw new AppError(
      `Invalid reportType. Use: ${values.join(", ")}`,
      400,
    );
  }
  return raw as ReportType;
}

function parseSortOrder(raw: string | undefined): SortOrder | undefined {
  if (!raw) {
    return undefined;
  }
  const values = Object.values(SortOrder) as string[];
  if (!values.includes(raw)) {
    throw new AppError(
      `Invalid sortOrder. Use: ${values.join(", ")}`,
      400,
    );
  }
  return raw as SortOrder;
}
