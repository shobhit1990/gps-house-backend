import { Request, Response } from "express";
import { inject, injectable } from "tsyringe";
import {
  ISimTrackingService,
  SimTrackingStatusFilter,
} from "../../../services/interfaces/ISimTrackingService";
import { asyncHandler } from "../../../utils/asyncHandler";
import { AppError } from "../../../utils/errors";

const STATUS_VALUES: SimTrackingStatusFilter[] = ["All", "Active", "Inactive"];

@injectable()
export class SimTrackingController {
  constructor(
    @inject("ISimTrackingService")
    private readonly simTrackingService: ISimTrackingService,
  ) {}

  getSimTrackingReport = asyncHandler(async (req: Request, res: Response) => {
    const status = this.parseStatus(req.query.status);
    const search = this.parseOptionalString(req.query.search, "search");

    const result = await this.simTrackingService.getSimTrackingReport({
      status,
      search,
    });

    res.status(200).json({
      message: "SIM Tracking Report fetched successfully",
      remainingCoins: result.remainingCoins,
      filter: result.filter,
      data: result.data,
    });
  });

  private parseStatus(raw: unknown): SimTrackingStatusFilter {
    if (raw === undefined || raw === null || raw === "") {
      return "All";
    }
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value !== "string" || !value.trim()) {
      throw new AppError("Invalid status", 400);
    }

    const trimmed = value.trim();
    const match = STATUS_VALUES.find(
      (item) => item.toLowerCase() === trimmed.toLowerCase(),
    );
    if (!match) {
      throw new AppError(`Invalid status. Use: ${STATUS_VALUES.join(", ")}`, 400);
    }
    return match;
  }

  private parseOptionalString(
    value: unknown,
    fieldName: string,
  ): string | undefined {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    const raw = Array.isArray(value) ? value[0] : value;
    if (typeof raw !== "string") {
      throw new AppError(`Invalid ${fieldName}`, 400);
    }
    const trimmed = raw.trim();
    return trimmed || undefined;
  }
}
