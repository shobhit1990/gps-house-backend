import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { PoiFilterType } from "../../../domain/enums/PoiFilterType";
import { PoiReportType } from "../../../domain/enums/PoiReportType";
import { IPoiReportService } from "../../../services/interfaces/IPoiReportService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { AppError } from "../../../utils/errors";
import { parseTravelDateTime } from "../../../utils/travelSummary";

@injectable()
export class PoiReportController {
  constructor(
    @inject("IPoiReportService")
    private readonly poiReportService: IPoiReportService,
  ) {}

  /**
   * Flow (as per UI):
   * 1) type = PoiReportType ("Vehicle Wise" | "Geofence Wise")
   * 2) if Vehicle Wise → filterType = PoiFilterType ("Transporter" | "Group")
   *    - Transporter → transporter + vehicle
   *    - Group → group (master)
   * 3) if Geofence Wise → geofence
   *
   * GET /poi-report?type=Vehicle Wise&filterType=Transporter&transporter=&vehicle=&from=&to=
   * GET /poi-report?type=Vehicle Wise&filterType=Group&group=&from=&to=
   * GET /poi-report?type=Geofence Wise&geofence=&from=&to=
   */
  getPoiReport = asyncHandler(async (req: Request, res: Response) => {
    const fromRaw = readQuery(req, "from") ?? readQuery(req, "startDate");
    const toRaw = readQuery(req, "to") ?? readQuery(req, "endDate");
    if (!fromRaw || !toRaw) {
      throw new AppError("from and to datetimes are required", 400);
    }

    const type = parseEnum(
      readQuery(req, "type") ?? readQuery(req, "reportType"),
      PoiReportType,
      "type",
    );

    let filterType: PoiFilterType | undefined;
    if (type === PoiReportType.VEHICLE_WISE) {
      filterType = parseEnum(
        readQuery(req, "filterType") ?? readQuery(req, "filter"),
        PoiFilterType,
        "filterType",
      );
    }

    const from = parseTravelDateTime(fromRaw, "from");
    const to = parseTravelDateTime(toRaw, "to");

    const transporterId =
      readQuery(req, "transporter") ?? readQuery(req, "transporterId");
    const vehicleId =
      readQuery(req, "vehicle") ?? readQuery(req, "vehicleId");
    const groupId = readQuery(req, "group") ?? readQuery(req, "groupId");
    const geofenceId =
      readQuery(req, "geofence") ?? readQuery(req, "geofenceId");
    const search = readQuery(req, "search");

    // Guard wrong params for the selected branch
    if (type === PoiReportType.GEOFENCE_WISE) {
      if (filterType || transporterId || vehicleId || groupId) {
        throw new AppError(
          "For type=Geofence Wise only geofence/from/to/search are allowed",
          400,
        );
      }
    }
    if (filterType === PoiFilterType.TRANSPORTER && groupId) {
      throw new AppError(
        "group is only allowed when filterType=Group",
        400,
      );
    }
    if (filterType === PoiFilterType.GROUP && (transporterId || vehicleId)) {
      throw new AppError(
        "transporter/vehicle are only allowed when filterType=Transporter",
        400,
      );
    }

    const result = await this.poiReportService.getPoiReport({
      type,
      filterType,
      transporterId:
        filterType === PoiFilterType.TRANSPORTER ? transporterId : undefined,
      vehicleId:
        filterType === PoiFilterType.TRANSPORTER ? vehicleId : undefined,
      groupId: filterType === PoiFilterType.GROUP ? groupId : undefined,
      geofenceId:
        type === PoiReportType.GEOFENCE_WISE ? geofenceId : undefined,
      search,
      from,
      to,
    });

    res.status(200).json({
      message: "POI Report fetched successfully",
      filter: {
        type: result.type,
        filterType: result.filterType,
        transporter: transporterId ?? null,
        vehicle: vehicleId ?? null,
        group: groupId ?? null,
        geofence: geofenceId ?? null,
        search: search ?? null,
        from: from.toISOString(),
        to: to.toISOString(),
      },
      data: result.data,
    });
  });
}

function readQuery(req: Request, key: string): string | undefined {
  const value = req.query[key];
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function parseEnum<T extends Record<string, string>>(
  raw: string | undefined,
  enumObj: T,
  fieldName: string,
): T[keyof T] {
  const values = Object.values(enumObj) as string[];
  if (!raw) {
    throw new AppError(
      `${fieldName} is required. Use: ${values.join(", ")}`,
      400,
    );
  }
  const match = values.find(
    (value) => value.toLowerCase() === raw.trim().toLowerCase(),
  );
  if (!match) {
    // Also accept enum keys e.g. VEHICLE_WISE
    const keyMatch = Object.entries(enumObj).find(
      ([key]) => key.toLowerCase() === raw.trim().toLowerCase(),
    );
    if (keyMatch) {
      return keyMatch[1] as T[keyof T];
    }
    throw new AppError(
      `Invalid ${fieldName}. Use: ${values.join(", ")}`,
      400,
    );
  }
  return match as T[keyof T];
}
