import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import { IVehicleLiveTrackingService } from "../../../services/interfaces/IVehicleLiveTrackingService";
import { asyncHandler } from "../../../utils/asyncHandler";

@injectable()
export class VehicleLiveTrackingController {
  constructor(
    @inject("IVehicleLiveTrackingService")
    private readonly vehicleLiveTrackingService: IVehicleLiveTrackingService,
  ) {}

  /** GET /vehicleLiveTracking?clientId=&transporterId= */
  getLiveTracking = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.vehicleLiveTrackingService.getVehicleLiveTracking({
      clientId: readQuery(req, "clientId"),
      transporterId: readQuery(req, "transporterId"),
    });
    res.status(200).json({
      message: "Vehicle live tracking fetched successfully",
      data,
    });
  });
}

function readQuery(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
